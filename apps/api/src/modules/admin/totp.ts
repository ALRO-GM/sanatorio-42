/**
 * Códigos de un solo uso por tiempo (TOTP, RFC 6238): los de Google
 * Authenticator, Aegis, 1Password… Sin base ni red, para poder probarlos con
 * los vectores de la norma.
 *
 * Seis cifras, pasos de 30 s y HMAC-SHA1: es lo que entienden todas las apps.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const STEP_SECONDS = 30
export const DIGITS = 6
/** Pasos de margen a cada lado: el reloj del móvil puede ir medio minuto desfasado. */
export const DRIFT_STEPS = 1

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** Base32 sin relleno, como lo leen las apps. */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let out = ''

  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8

    while (bits >= 5) {
      out += ALPHABET.charAt((value >>> (bits - 5)) & 31)
      bits -= 5
    }
  }

  if (bits > 0) out += ALPHABET.charAt((value << (5 - bits)) & 31)

  return out
}

/** Al revés. `null` si lleva algo que no es base32. Admite minúsculas, espacios y `=`. */
export function base32Decode(text: string): Uint8Array | null {
  const clean = text.toUpperCase().replace(/[\s=]/g, '')
  const out: number[] = []
  let bits = 0
  let value = 0

  for (const char of clean) {
    const index = ALPHABET.indexOf(char)

    if (index === -1) return null

    value = (value << 5) | index
    bits += 5

    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }

  return new Uint8Array(out)
}

/** Un secreto nuevo: 20 bytes, lo que recomienda la norma para SHA1. */
export function newSecret(): Uint8Array {
  return new Uint8Array(randomBytes(20))
}

/** El código de un paso (HOTP, RFC 4226), con las cifras que se pidan. */
export function codeAt(secret: Uint8Array, step: number, digits = DIGITS): string {
  const counter = Buffer.alloc(8)

  counter.writeBigUInt64BE(BigInt(step))

  const hash = createHmac('sha1', secret).update(counter).digest()
  const offset = (hash[hash.length - 1] ?? 0) & 15
  const binary =
    (((hash[offset] ?? 0) & 127) << 24) |
    ((hash[offset + 1] ?? 0) << 16) |
    ((hash[offset + 2] ?? 0) << 8) |
    (hash[offset + 3] ?? 0)

  return String(binary % 10 ** digits).padStart(digits, '0')
}

/** El paso en el que cae un instante (ms). */
export function stepOf(at: number): number {
  return Math.floor(at / 1000 / STEP_SECONDS)
}

/**
 * El paso al que corresponde un código, mirando el actual y uno a cada lado, o
 * `null` si no vale. Un paso ya usado (`usedUpTo`) o anterior no vale: así un
 * código visto por encima del hombro no sirve dos veces.
 */
export function matchStep(
  secret: Uint8Array,
  code: string,
  at: number,
  usedUpTo: number | null,
): number | null {
  if (!/^\d{6}$/.test(code)) return null

  const now = stepOf(at)

  for (let step = now - DRIFT_STEPS; step <= now + DRIFT_STEPS; step += 1) {
    if (usedUpTo !== null && step <= usedUpTo) continue

    const expected = Buffer.from(codeAt(secret, step))

    if (timingSafeEqual(expected, Buffer.from(code))) return step
  }

  return null
}

/** Lo que lleva el QR: las apps lo leen y se dan de alta solas. */
export function otpauthUri(issuer: string, account: string, secret: Uint8Array): string {
  const label = encodeURIComponent(`${issuer}:${account}`)
  const query = new URLSearchParams({
    secret: base32Encode(secret),
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  })

  return `otpauth://totp/${label}?${query.toString()}`
}
