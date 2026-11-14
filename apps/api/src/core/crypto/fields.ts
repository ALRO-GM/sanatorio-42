/**
 * Cifrado de campos: lo privado que escribe la gente (mensajes, avisos,
 * incidencias y denuncias, notas…) se guarda cifrado en la base.
 *
 * Por qué (`docs/cifrado.md`): la base y sus copias son ficheros que se mueven
 * (al portátil de quien despliega, a un disco). Si uno se escapa, lo cifrado no
 * se lee sin la clave, que vive solo en el entorno del servidor (`DATA_KEY`),
 * fuera de la base y de las copias. Eso abarata mucho una filtración (RGPD,
 * art. 34.3.a). No protege de un servidor comprometido: allí está la clave.
 *
 * - AES-256-GCM (`node:crypto`): cifra y, con la etiqueta, detecta cualquier
 *   cambio. Un valor tocado no se lee: da error, no un texto a medias.
 * - Formato `v1:<clave>:<iv>:<datos>:<etiqueta>`, en base64url. `<clave>` es
 *   la huella de la clave con la que se cifró: con varias claves cargadas
 *   (`DATA_KEY_PREVIOUS`) se sabe cuál abre cada valor, y se puede rotar.
 * - Lectura tolerante: lo que no tiene esa forma es texto en claro de antes del
 *   cifrado y se devuelve tal cual. El paso al arrancar (`seal-existing.ts`) lo
 *   cifra; después ya no queda nada así.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const VERSION = 'v1'
const KEY_BYTES = 32
const IV_BYTES = 12
const TAG_BYTES = 16

/**
 * La forma exacta de un valor cifrado. Un texto de una persona con esta pinta
 * es prácticamente imposible (huella de 8, iv de 16 y etiqueta de 22
 * caracteres base64url), así que lo que no encaja se lee como texto en claro.
 */
const SEALED = /^v1:([A-Za-z0-9_-]{8}):([A-Za-z0-9_-]{16}):([A-Za-z0-9_-]*):([A-Za-z0-9_-]{22})$/

/**
 * Clave de desarrollo, tests y demostración. Es pública (está en el repo): no
 * protege nada y la configuración no deja usarla en producción.
 */
export const DEV_DATA_KEY = createHash('sha256').update('peer4u-clave-de-desarrollo').digest()

/** Un valor cifrado que no se puede abrir: tocado, o de una clave que no está. */
export class SealedFieldError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SealedFieldError'
  }
}

/** AES-256-GCM a pelo: lo comparten este fichero y el segundo factor del panel. */
export function gcmSeal(
  key: Uint8Array,
  plain: Uint8Array,
  aad?: Uint8Array,
): { iv: Buffer; body: Buffer; tag: Buffer } {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  if (aad !== undefined) cipher.setAAD(aad)

  const body = Buffer.concat([cipher.update(plain), cipher.final()])

  return { iv, body, tag: cipher.getAuthTag() }
}

/**
 * Abre lo de `gcmSeal`.
 *
 * @throws {Error} Si la clave no es la buena o algo se ha tocado.
 */
export function gcmOpen(
  key: Uint8Array,
  parts: { iv: Uint8Array; body: Uint8Array; tag: Uint8Array },
  aad?: Uint8Array,
): Buffer {
  const decipher = createDecipheriv(ALGORITHM, key, parts.iv)

  if (aad !== undefined) decipher.setAAD(aad)
  decipher.setAuthTag(parts.tag)

  return Buffer.concat([decipher.update(parts.body), decipher.final()])
}

/** La huella de una clave: dice cuál es sin decir nada de ella. */
function keyIdOf(key: Uint8Array): string {
  return createHash('sha256').update('peer4u-data-key:').update(key).digest('base64url').slice(0, 8)
}

/**
 * Lee una clave de 32 bytes escrita en base64 (`openssl rand -base64 32`).
 *
 * @throws {Error} Si no son 32 bytes: una clave corta o mal copiada no se usa.
 */
export function parseDataKey(raw: string, name = 'DATA_KEY'): Buffer {
  const trimmed = raw.trim()
  const key = Buffer.from(trimmed, 'base64')

  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(trimmed) || key.length !== KEY_BYTES) {
    throw new Error(`${name} debe ser una clave de 32 bytes en base64 (openssl rand -base64 32)`)
  }

  return key
}

export type FieldCipher = {
  /** Huella de la clave con la que se cifra lo nuevo. */
  readonly keyId: string
  /** Cifra un texto. */
  seal: (plain: string) => string
  /** Cifra un texto, o deja `null` lo que no lo es (columnas opcionales). */
  sealOrNull: (plain: string | null | undefined) => string | null
  /**
   * El texto de un valor guardado: el de dentro si está cifrado, y él mismo si
   * es texto en claro de antes.
   *
   * @throws {SealedFieldError} Si está cifrado y no se puede abrir.
   */
  open: (stored: string) => string
  /** Lo mismo para lo que sale de una fila: lo que no es texto, `null`. */
  openOrNull: (value: unknown) => string | null
  /** `true` si el valor ya está cifrado con la clave de ahora. */
  isCurrent: (stored: string) => boolean
}

/**
 * El cifrado de campos con una clave para lo nuevo y, para rotar, las de antes
 * (solo para leer).
 */
export function createFieldCipher(keys: {
  current: Uint8Array
  previous?: readonly Uint8Array[]
}): FieldCipher {
  const keyId = keyIdOf(keys.current)
  const ring = new Map<string, Uint8Array>()

  for (const key of [keys.current, ...(keys.previous ?? [])]) {
    if (key.length !== KEY_BYTES) throw new Error('Una clave de datos tiene que tener 32 bytes')
    ring.set(keyIdOf(key), key)
  }

  // La cabecera va como dato asociado: cambiar la versión o la huella también
  // rompe la etiqueta.
  const headerOf = (id: string): Buffer => Buffer.from(`${VERSION}:${id}`)

  const seal = (plain: string): string => {
    const { iv, body, tag } = gcmSeal(keys.current, Buffer.from(plain, 'utf8'), headerOf(keyId))

    return [VERSION, keyId, ...[iv, body, tag].map((part) => part.toString('base64url'))].join(':')
  }

  const open = (stored: string): string => {
    const match = SEALED.exec(stored)

    if (match === null) return stored

    const [, id = '', iv = '', body = '', tag = ''] = match
    const key = ring.get(id)

    if (key === undefined) {
      throw new SealedFieldError(
        `Hay un dato cifrado con una clave que no está cargada (${id}): ¿falta DATA_KEY_PREVIOUS?`,
      )
    }

    const parts = {
      iv: Buffer.from(iv, 'base64url'),
      body: Buffer.from(body, 'base64url'),
      tag: Buffer.from(tag, 'base64url'),
    }

    if (parts.iv.length !== IV_BYTES || parts.tag.length !== TAG_BYTES) {
      throw new SealedFieldError('Un dato cifrado está mal formado')
    }

    try {
      return gcmOpen(key, parts, headerOf(id)).toString('utf8')
    } catch {
      throw new SealedFieldError('Un dato cifrado no pasa la comprobación: se ha tocado')
    }
  }

  return {
    keyId,
    seal,
    sealOrNull: (plain) => (plain === null || plain === undefined ? null : seal(plain)),
    open,
    openOrNull: (value) => (typeof value === 'string' ? open(value) : null),
    isCurrent: (stored) => SEALED.exec(stored)?.[1] === keyId,
  }
}

/** Lo que hace falta del entorno (`config/env.ts`). */
type DataKeyEnv = {
  readonly DATA_KEY: string
  readonly DATA_KEY_PREVIOUS: string
}

/**
 * El cifrado de campos según el entorno. Sin `DATA_KEY`, la clave de
 * desarrollo: la configuración ya ha impedido arrancar así en producción.
 */
export function fieldCipherFromEnv(env: DataKeyEnv): FieldCipher {
  const current = env.DATA_KEY.trim() === '' ? DEV_DATA_KEY : parseDataKey(env.DATA_KEY)
  const previous = env.DATA_KEY_PREVIOUS.split(/[,\s]+/)
    .filter((raw) => raw !== '')
    .map((raw) => parseDataKey(raw, 'DATA_KEY_PREVIOUS'))

  return createFieldCipher({ current, previous })
}

/** El de desarrollo y tests, para quien no recibe otro. */
export const devFieldCipher: FieldCipher = createFieldCipher({ current: DEV_DATA_KEY })
