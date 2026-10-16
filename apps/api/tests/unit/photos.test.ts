/**
 * Fotos de perfil: la CDN de 42 ya no las da sin sesión de la intra, así que
 * las pide el servidor con el token de la aplicación, las guarda y las sirve.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { FortyTwoClient } from '../../src/integrations/forty-two/client.js'
import { createThrottle } from '../../src/integrations/forty-two/throttle.js'
import {
  PHOTOS_PER_HOUR,
  createPhotos,
  memoryPhotoStore,
  photoKey,
} from '../../src/modules/replica/photos.js'
import { stubAppTokens } from '../helpers/fake-api.js'

const PHOTO = 'https://cdn.intra.42.fr/users/abc/medium_ana.jpg'
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])

type Reply = { status?: number; type?: string; body?: Uint8Array }

/** Un cliente de 42 cuya red contesta lo que se le diga, y apunta lo que se pide. */
function clientWith(reply: (url: string) => Reply) {
  const calls: { url: string; auth: string }[] = []
  const fetchImpl = ((input: string | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.href
    const headers = (init?.headers ?? {}) as Record<string, string>

    calls.push({ url, auth: headers.Authorization ?? '' })

    const { status = 200, type = 'image/jpeg', body = JPEG } = reply(url)

    return Promise.resolve(new Response(body, { status, headers: { 'content-type': type } }))
  }) as typeof fetch
  const client = new FortyTwoClient({
    apiV2Base: 'https://api.intra.42.fr/v2',
    userAgent: 'test/1.0',
    timeoutMs: 1_000,
    pageSize: 100,
    throttle: createThrottle({ minIntervalMs: 0, sleep: () => Promise.resolve() }),
    tokens: stubAppTokens().provider,
    fetchImpl,
  })

  return { client, calls }
}

describe('fotos de la CDN de 42', () => {
  it('las pide con el token de la aplicación', async () => {
    const { client, calls } = clientWith(() => ({}))

    expect(await client.getCdnImage(PHOTO)).toEqual({ type: 'image/jpeg', body: JPEG })
    expect(calls).toEqual([{ url: PHOTO, auth: 'Bearer token-de-app' }])
  })

  it('solo de la CDN y por https: lo demás ni se pide', async () => {
    const { client, calls } = clientWith(() => ({}))

    for (const url of [
      'http://cdn.intra.42.fr/users/a.jpg',
      'https://evil.example/users/a.jpg',
      'https://cdn.intra.42.fr.evil.example/a.jpg',
      'https://localhost/a.jpg',
      'no es una dirección',
      '',
    ]) {
      await expect(client.getCdnImage(url)).rejects.toThrow()
    }
    expect(calls).toEqual([])
  })

  it('rechaza lo que no es una imagen, lo vacío, lo enorme y los errores de 42', async () => {
    const cases: Reply[] = [
      { type: 'text/html' },
      { type: 'image/svg+xml' },
      { body: new Uint8Array() },
      { body: new Uint8Array(3 * 1024 * 1024 + 1) },
      { status: 403 },
      { status: 404 },
    ]

    for (const reply of cases) {
      await expect(clientWith(() => reply).client.getCdnImage(PHOTO)).rejects.toThrow()
    }
    // Justo en el límite, sí.
    const limit = new Uint8Array(3 * 1024 * 1024)

    expect((await clientWith(() => ({ body: limit })).client.getCdnImage(PHOTO)).body).toHaveLength(
      limit.length,
    )
  })
})

describe('fotos servidas desde aquí', () => {
  let db: Db
  let now = 0

  beforeEach(async () => {
    db = await openDatabase({ url: 'file::memory:' })
    now = Date.parse('2026-10-16T10:00:00Z')
    await db.execute({
      sql: `INSERT INTO users (id, login, image, synced_at) VALUES
              (1, 'ana', ?, 'x'), (2, 'leo', NULL, 'x'), (3, 'sol', '', 'x')`,
      args: [PHOTO],
    })
  })

  afterEach(() => {
    closeDatabase(db)
  })

  const photosWith = (reply: (url: string) => Reply, halted = false) => {
    const { client, calls } = clientWith(reply)
    const store = memoryPhotoStore()
    const photos = createPhotos({ db, client, store, now: () => now, halted: () => halted })

    return { photos, calls, store }
  }

  it('la primera vez se baja y se guarda; después sale de lo guardado', async () => {
    const { photos, calls, store } = photosWith(() => ({}))

    expect(await photos.photoOf('ana')).toEqual({ type: 'image/jpeg', body: JPEG })
    expect(await photos.photoOf('ana')).toEqual({ type: 'image/jpeg', body: JPEG })
    expect(calls).toHaveLength(1)
    expect(await store.read(photoKey(PHOTO))).not.toBeNull()
  })

  it('dos a la vez esperan a la misma descarga', async () => {
    const { photos, calls } = photosWith(() => ({}))

    await Promise.all([photos.photoOf('ana'), photos.photoOf('ana'), photos.photoOf('ana')])
    expect(calls).toHaveLength(1)
  })

  it('sin foto, sin persona o con el servicio cortado, no hay nada que pedir', async () => {
    const { photos, calls } = photosWith(() => ({}))

    expect(await photos.photoOf('leo')).toBeNull()
    expect(await photos.photoOf('sol')).toBeNull()
    expect(await photos.photoOf('nadie')).toBeNull()
    expect(calls).toHaveLength(0)

    const cut = photosWith(() => ({}), true)

    expect(await cut.photos.photoOf('ana')).toBeNull()
    expect(cut.calls).toHaveLength(0)
  })

  it('si 42 no la da, no se insiste hasta pasada una hora', async () => {
    let status = 403
    const { photos, calls } = photosWith(() => ({ status }))

    expect(await photos.photoOf('ana')).toBeNull()
    expect(await photos.photoOf('ana')).toBeNull()
    expect(calls).toHaveLength(1)

    status = 200
    now += 61 * 60_000
    expect(await photos.photoOf('ana')).not.toBeNull()
    expect(calls).toHaveLength(2)
  })

  it('como mucho se piden tantas fotos nuevas por hora', async () => {
    const { photos, calls } = photosWith(() => ({}))
    const many = Array.from({ length: PHOTOS_PER_HOUR + 1 }, (_, index) => index + 10)

    await db.batch(
      many.map((id) => ({
        sql: `INSERT INTO users (id, login, image, synced_at) VALUES (?, ?, ?, 'x')`,
        args: [id, `p${id}`, `https://cdn.intra.42.fr/users/${id}/p.jpg`],
      })),
    )
    for (const id of many) await photos.photoOf(`p${id}`)

    expect(calls).toHaveLength(PHOTOS_PER_HOUR)
    // La que no cupo, a la hora siguiente.
    now += 60 * 60_000
    expect(await photos.photoOf(`p${many.at(-1) ?? 0}`)).not.toBeNull()
  })
})
