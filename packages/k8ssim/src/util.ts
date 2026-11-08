/** Piezas sueltas: nombres deterministas, cantidades, edades, tablas y base64. */

import { ShellError } from '@sanatorio/shellsim'

/** Un hash pequeño y estable (FNV-1a de 32 bits), para nombres y uid deterministas. */
function hash(text: string): number {
  let h = 0x811c9dc5

  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }

  return h
}

/** Las letras con las que Kubernetes inventa sufijos (sin vocales ni cifras que se confundan). */
const ALPHABET = 'bcdfghjklmnpqrstvwxz2456789'

/** Un sufijo de `n` letras sacado de un texto (`7c9d8f6b5d`, `x2kq9`). */
export function suffix(seed: string, n: number): string {
  let out = ''
  let h = hash(seed)

  for (let i = 0; i < n; i++) {
    if (i % 5 === 0 && i > 0) h = hash(`${seed}:${i}`)
    out += ALPHABET[h % ALPHABET.length] ?? 'x'
    h = Math.floor(h / ALPHABET.length)
  }

  return out
}

/** Un uid con forma de uid (`3f2a…-…`). */
export function uidOf(seed: string): string {
  const hex = (s: string) => hash(s).toString(16).padStart(8, '0')
  const a = hex(seed)
  const b = hex(`${seed}/b`)
  const c = hex(`${seed}/c`)
  const d = hex(`${seed}/d`)

  return `${a}-${b.slice(0, 4)}-${b.slice(4)}-${c.slice(0, 4)}-${c.slice(4)}${d}`
}

/** Un digest `sha256:…` de 64 caracteres. */
export function digest(seed: string): string {
  let out = ''

  for (let i = 0; out.length < 64; i++) out += hash(`${seed}#${i}`).toString(16).padStart(8, '0')

  return `sha256:${out.slice(0, 64)}`
}

/** CPU en milicores: `100m`, `0.5`, `1`. `null` si no se entiende. */
export function milliCpu(text: string): number | null {
  const match = /^(\d+(?:\.\d+)?)(m?)$/.exec(text.trim())

  if (match === null) return null

  return match[2] === 'm' ? Math.round(Number(match[1])) : Math.round(Number(match[1]) * 1000)
}

const UNITS: Record<string, number> = {
  '': 1,
  k: 1000,
  M: 1000 ** 2,
  G: 1000 ** 3,
  Ki: 1024,
  Mi: 1024 ** 2,
  Gi: 1024 ** 3,
}

/** Memoria en bytes: `128Mi`, `1Gi`, `256M`, `500000`. `null` si no se entiende. */
export function bytesOf(text: string): number | null {
  const match = /^(\d+(?:\.\d+)?)(k|M|G|Ki|Mi|Gi)?$/.exec(text.trim())

  if (match === null) return null

  return Math.round(Number(match[1]) * (UNITS[match[2] ?? ''] ?? 1))
}

/** Bytes como los enseña `kubectl top` (`45Mi`). */
export const mi = (bytes: number): string => `${Math.round(bytes / 1024 ** 2)}Mi`

/** La edad como la enseña kubectl: `5s`, `2m10s`, `12m`, `3h20m`, `4d`. */
export function age(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))

  if (s < 120) return `${s}s`
  if (s < 600) return `${Math.floor(s / 60)}m${s % 60 === 0 ? '' : `${s % 60}s`}`
  if (s < 3 * 3600) return `${Math.floor(s / 60)}m`
  if (s < 8 * 3600) {
    const m = Math.floor((s % 3600) / 60)

    return `${Math.floor(s / 3600)}h${m === 0 ? '' : `${m}m`}`
  }
  if (s < 2 * 86_400) return `${Math.floor(s / 3600)}h`

  return `${Math.floor(s / 86_400)}d`
}

/** Una tabla con columnas separadas por tres espacios, como `kubectl get`. */
export function table(head: readonly string[], rows: readonly (readonly string[])[]): string {
  const widths = head.map((title, i) =>
    Math.max(title.length, ...rows.map((row) => (row[i] ?? '').length)),
  )
  const line = (cells: readonly string[]) =>
    cells
      .map((cell, i) => (i === cells.length - 1 ? cell : cell.padEnd((widths[i] ?? 0) + 3)))
      .join('')
      .trimEnd()

  return `${[line(head), ...rows.map(line)].join('\n')}\n`
}

/** El reloj del clúster como fecha (`2026-11-09T09:00:05Z`): empieza el 9 de noviembre de 2026. */
export function isoAt(seconds: number): string {
  return new Date(Date.UTC(2026, 10, 9, 9, 0, 0) + seconds * 1000)
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** Los bytes UTF-8 de un texto (sin `TextEncoder`, que no está en todos los sitios donde corre el motor). */
function utf8(text: string): number[] {
  const out: number[] = []

  for (const char of text) {
    const code = char.codePointAt(0) ?? 0

    if (code < 0x80) out.push(code)
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 63))
    else if (code < 0x10000)
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63))
    else
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 63),
        0x80 | ((code >> 6) & 63),
        0x80 | (code & 63),
      )
  }

  return out
}

export function encode64(text: string): string {
  const bytes = utf8(text)
  let out = ''

  for (let i = 0; i < bytes.length; i += 3) {
    const [a = 0, b = 0, c = 0] = bytes.slice(i, i + 3)
    const n = (a << 16) | (b << 8) | c

    out += B64[(n >> 18) & 63] ?? ''
    out += B64[(n >> 12) & 63] ?? ''
    out += i + 1 < bytes.length ? (B64[(n >> 6) & 63] ?? '') : '='
    out += i + 2 < bytes.length ? (B64[n & 63] ?? '') : '='
  }

  return out
}

/** Base64 → texto; lanza si no es base64 (como `base64 -d`: «invalid input»). */
export function decode64(text: string): string {
  const clean = text.replace(/\s+/g, '')

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 === 1)
    throw new ShellError('base64: invalid input')

  const bytes: number[] = []

  for (let i = 0; i < clean.length; i += 4) {
    const chunk = clean.slice(i, i + 4)
    const values = Array.from({ length: chunk.length }, (_, k) =>
      chunk.charAt(k) === '=' ? 0 : B64.indexOf(chunk.charAt(k)),
    )
    const n =
      ((values[0] ?? 0) << 18) |
      ((values[1] ?? 0) << 12) |
      ((values[2] ?? 0) << 6) |
      (values[3] ?? 0)

    bytes.push((n >> 16) & 255)
    if (chunk[2] !== '=' && chunk.length > 2) bytes.push((n >> 8) & 255)
    if (chunk[3] !== '=' && chunk.length > 3) bytes.push(n & 255)
  }

  let out = ''

  for (let i = 0; i < bytes.length;) {
    const a = bytes[i] ?? 0
    const extra = a >= 0xf0 ? 3 : a >= 0xe0 ? 2 : a >= 0xc0 ? 1 : 0
    let code = extra === 0 ? a : a & (0x3f >> extra)

    for (let j = 1; j <= extra; j++) code = (code << 6) | ((bytes[i + j] ?? 0) & 63)
    out += String.fromCodePoint(code)
    i += extra + 1
  }

  return out
}
