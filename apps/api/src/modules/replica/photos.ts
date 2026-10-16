/**
 * Fotos de perfil, servidas desde aquí.
 *
 * La CDN de 42 ya no da las fotos a quien no tiene la intra abierta (contesta
 * 403): en un equipo sin sesión de 42 no salía ninguna. El servidor sí puede
 * pedirlas, con el token de la aplicación, así que las pide una vez, las guarda
 * y las sirve él.
 *
 * La foto se guarda por su dirección, que en 42 cambia cuando cambia la foto
 * (lleva un hash): una dirección ya bajada no se vuelve a pedir nunca.
 */

import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { Db } from '../../core/db/database.js'
import { toText } from '../../core/db/rows.js'
import type { FortyTwoClient } from '../../integrations/forty-two/client.js'

export type Photo = { type: string; body: Uint8Array }

/** Dónde se guardan las fotos ya bajadas. */
export type PhotoStore = {
  read: (key: string) => Promise<Photo | null>
  write: (key: string, photo: Photo) => Promise<void>
}

/** Extensión de cada tipo, para guardar el tipo en el nombre del fichero. */
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

/** Las fotos, en una carpeta: un fichero por dirección. */
export function diskPhotoStore(dir: string): PhotoStore {
  let ready: Promise<unknown> | null = null

  return {
    async read(key) {
      for (const [type, extension] of Object.entries(EXTENSIONS)) {
        try {
          return { type, body: new Uint8Array(await readFile(join(dir, `${key}.${extension}`))) }
        } catch {
          // No está con esta extensión: se prueba la siguiente.
        }
      }

      return null
    },

    async write(key, photo) {
      const extension = EXTENSIONS[photo.type]

      if (extension === undefined) return

      ready ??= mkdir(dir, { recursive: true })
      await ready

      // Primero a un temporal y después se renombra: quien lea a la vez nunca
      // ve una foto a medias.
      const target = join(dir, `${key}.${extension}`)
      const temporary = `${target}.${process.pid}.tmp`

      await writeFile(temporary, photo.body)
      await rename(temporary, target)
    },
  }
}

/** Las fotos, en memoria: para los tests y para cuando no hay disco. */
export function memoryPhotoStore(): PhotoStore {
  const photos = new Map<string, Photo>()

  return {
    read: (key) => Promise.resolve(photos.get(key) ?? null),
    write: (key, photo) => {
      photos.set(key, photo)

      return Promise.resolve()
    },
  }
}

export type PhotosOptions = {
  db: Db
  client: FortyTwoClient
  store: PhotoStore
  /** `true` si el servicio está cortado por el límite del plan: no se pide nada a 42. */
  halted?: () => boolean
  now?: () => number
  log?: (message: string) => void
}

/** Fotos nuevas que se piden a la CDN, como mucho, en una hora. */
export const PHOTOS_PER_HOUR = 1500

/** Cuánto se tarda en volver a intentar una foto que 42 no dio. */
const RETRY_AFTER_MS = 60 * 60_000

/** Lo que se recuerda de fotos que fallaron, como mucho (se vacía al llegar). */
const MAX_FAILURES = 5000

/** La clave de una foto: un resumen de su dirección, que sirve de nombre de fichero. */
export function photoKey(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 40)
}

export function createPhotos(options: PhotosOptions) {
  const { db, client, store } = options
  const now = options.now ?? Date.now
  const log = options.log ?? (() => undefined)
  const halted = options.halted ?? (() => false)

  /** Fotos que 42 no dio y cuándo se puede volver a probar. */
  const failed = new Map<string, number>()
  /** Lo que se está bajando ahora: dos peticiones a la vez esperan a la misma. */
  const pending = new Map<string, Promise<Photo | null>>()
  /** Cuántas se han pedido en la hora en curso. */
  let hour = { start: 0, count: 0 }

  /** `true` si queda margen esta hora para pedir una foto nueva. */
  function spend(): boolean {
    if (now() - hour.start >= 60 * 60_000) hour = { start: now(), count: 0 }
    if (hour.count >= PHOTOS_PER_HOUR) return false

    hour.count += 1

    return true
  }

  async function download(url: string, key: string): Promise<Photo | null> {
    if ((failed.get(key) ?? 0) > now() || halted() || !spend()) return null

    try {
      const photo = await client.getCdnImage(url)

      await store.write(key, photo)

      return photo
    } catch (error) {
      if (failed.size >= MAX_FAILURES) failed.clear()
      failed.set(key, now() + RETRY_AFTER_MS)
      log(`foto ${url}: ${error instanceof Error ? error.message : String(error)}`)

      return null
    }
  }

  return {
    /**
     * La foto de alguien, o `null` si no tiene, no se sabe o 42 no la da ahora.
     * La primera vez cuesta una descarga de la CDN; después sale del almacén.
     */
    async photoOf(login: string): Promise<Photo | null> {
      const result = await db.execute({
        sql: 'SELECT image FROM users WHERE login = ?',
        args: [login],
      })
      const url = result.rows[0] === undefined ? '' : toText(result.rows[0].image)

      if (url === '') return null

      const key = photoKey(url)
      const stored = await store.read(key)

      if (stored !== null) return stored

      const running = pending.get(key) ?? download(url, key)

      pending.set(key, running)

      try {
        return await running
      } finally {
        pending.delete(key)
      }
    },
  }
}

export type Photos = ReturnType<typeof createPhotos>
