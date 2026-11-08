/**
 * Identificadores deterministas: lo que en Docker es un sha256 aquí sale de un
 * hash sencillo (FNV-1a) del contenido. No es criptográfico ni hace falta:
 * solo que la misma imagen dé siempre el mismo id en la web y en la API, y que
 * una distinta dé otro.
 */

function fnv(text: string, seed: number): number {
  let hash = (0x811c9dc5 ^ seed) >>> 0

  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }

  return hash >>> 0
}

/** 64 cifras hexadecimales (como un sha256) de un texto. */
export function hex64(text: string): string {
  let out = ''

  for (let i = 0; i < 8; i++)
    out += fnv(text, i * 0x9e3779b1)
      .toString(16)
      .padStart(8, '0')

  return out
}

/** `sha256:…` de un texto. */
export const digestOf = (text: string): string => `sha256:${hex64(text)}`

/** Los 12 primeros caracteres de un id, como los enseña Docker. */
export const short = (id: string): string => id.replace(/^sha256:/, '').slice(0, 12)
