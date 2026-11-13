/**
 * Tokenización y normalización: cómo se convierte un texto en las palabras que
 * se cuentan y se comparan. Con todo apagado, «Reintentos» y «reintentos» son
 * palabras distintas y «¿cola?» no casa con «colas»; cada opción arregla una de
 * esas diferencias que no importan.
 */

export type TokenOptions = {
  /** Minúsculas, sin acentos y con los identificadores partidos (`MAX_RETRIES` → max, retries). */
  normalize: boolean
  /** Quita las palabras vacías («de», «la», «the», «is»): están en todas partes y no distinguen nada. */
  stopwords: boolean
  /** Recorta plurales y terminaciones: «reintentos», «reintenta» y «reintentar» cuentan como la misma. */
  stem: boolean
}

export const ALL_TOKEN_OPTIONS: TokenOptions = { normalize: true, stopwords: true, stem: true }

/** Una palabra con su sitio en el texto. */
export type Word = { text: string; start: number; end: number }

/** Las palabras de un texto tal cual están escritas, separadas por espacios (lo que mide un trozo). */
export function words(text: string): Word[] {
  return [...text.matchAll(/\S+/g)].map((match) => ({
    text: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }))
}

/** Cuántos tokens ocupa un texto. En este curso, un token es una palabra. */
export function countTokens(text: string): number {
  return text.match(/\S+/g)?.length ?? 0
}

const STOPWORDS = new Set(
  (
    'a al algo ante antes como con cual cuando de del desde donde el ella en entre era es esa ese eso esta este esto ' +
    'ha hay la las le lo los mas me mi muy no o para pero por que se si sin su sus te tu un una uno y ya ' +
    'cuantas cuantos cuanta cuanto cada hace son ' +
    'an and are as at be but by do does did for from has have how i if in is it its me my of on or so that the ' +
    'their then there this to up was what when where which who why will with you your many much'
  ).split(' '),
)

const lower = (word: string): string => word.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')

/** Parte un identificador: `backoff_seconds` y `QueueFull` dan también sus trozos. */
function identifierParts(word: string): string[] {
  const parts = word
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[_\s]+/)
    .filter((part) => part !== '')

  return parts.length > 1 ? [word, ...parts] : [word]
}

/** Plurales del castellano y del inglés, y luego una terminación; nunca deja menos de 4 letras. */
function stem(word: string): string {
  const strip = (from: string, endings: readonly string[]): string => {
    for (const ending of endings)
      if (from.endsWith(ending) && from.length - ending.length >= 4)
        return from.slice(0, from.length - ending.length)

    return from
  }
  const singular = word.endsWith('ies') && word.length > 5 ? `${word.slice(0, -3)}y` : word

  return strip(strip(singular, ['es', 's']), [
    'iendo',
    'ando',
    'ados',
    'adas',
    'ado',
    'ada',
    'ido',
    'ida',
    'ing',
    'ed',
    'ar',
    'er',
    'ir',
    'an',
    'en',
    'a',
    'o',
    'e',
  ])
}

/** Las palabras de un texto, sin signos, tal cual (con mayúsculas y acentos). */
function rawTokens(text: string): string[] {
  return text.match(/[\p{L}\p{N}_]+/gu) ?? []
}

/** Los tokens de un texto según las opciones: lo que indexa y lo que busca la búsqueda léxica. */
export function tokenize(text: string, options: TokenOptions): string[] {
  const tokens: string[] = []

  for (const raw of rawTokens(text)) {
    const parts = options.normalize ? identifierParts(raw).map(lower) : [raw]

    for (const part of parts) {
      if (options.stopwords && STOPWORDS.has(lower(part))) continue
      tokens.push(options.stem ? stem(part) : part)
    }
  }

  return tokens
}

/** Los tokens con todo encendido: lo que usan el «modelo» de embeddings y el generador. */
export function normalized(text: string): string[] {
  return tokenize(text, ALL_TOKEN_OPTIONS)
}

/** Las palabras en minúsculas y sin acentos, sin quitar ni recortar nada (para casar conceptos). */
export function plain(text: string): string[] {
  return rawTokens(text).flatMap((raw) => identifierParts(raw).map(lower))
}
