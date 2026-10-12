/**
 * Reglas de los documentos verificables y de las claves de staff. Funciones
 * puras: ni base, ni reloj, ni azar (el azar lo pone quien llama).
 */

/** Sin letras ni números que se confundan al leerlos o al dictarlos (0/O, 1/I/L). */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 4

/** Cuántos códigos distintos caben: 31⁴ = 923 521. */
export const CODE_SPACE = CODE_ALPHABET.length ** CODE_LENGTH

const CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`)

/** Marca de UTF-8 que llevan los CSV para que Excel no estropee las tildes. */
const BOM = String.fromCharCode(0xfeff)

/** Lo que precede al código en la última línea del documento. */
export const CODE_LABEL = 'codigo_de_verificacion'

/** Un código con los caracteres que da `pick` (un índice del alfabeto cada vez). */
export function makeCode(pick: (max: number) => number): string {
  return Array.from({ length: CODE_LENGTH }, () => {
    const index = pick(CODE_ALPHABET.length)

    // Un `pick` que se salga del alfabeto sería un fallo nuestro, no un código raro.
    if (!Number.isInteger(index) || index < 0 || index >= CODE_ALPHABET.length) {
      throw new RangeError(`índice fuera del alfabeto: ${index}`)
    }

    return CODE_ALPHABET.charAt(index)
  }).join('')
}

/**
 * El código tal como se guarda, a partir de lo que alguien teclea: sin espacios
 * ni guiones y en mayúsculas. `null` si no puede ser un código.
 */
export function normaliseCode(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 32) return null

  const code = raw.replace(/[\s-]/g, '').toUpperCase()

  return CODE_PATTERN.test(code) ? code : null
}

/**
 * El nombre del fichero, con el código al final:
 * `horas-validadas_jdoe_2026-09-12_2026-10-12_K7QF.csv`.
 *
 * Va en una cabecera HTTP, así que solo lleva letras, números, guiones y puntos.
 */
export function fileName(subject: string | null, from: string, to: string, code: string): string {
  const safe = (text: string): string => text.replace(/[^A-Za-z0-9.-]/g, '').slice(0, 40)
  const who = subject === null ? 'todos' : safe(subject) || 'x'

  return `horas-validadas_${who}_${safe(from)}_${safe(to)}_${safe(code)}.csv`
}

/** El documento con su última línea: la que lleva el código. */
export function withCode(csv: string, code: string): string {
  const body = csv.endsWith('\r\n') ? csv : `${csv}\r\n`

  return `${body}"${CODE_LABEL}";"${code}"\r\n`
}

/**
 * Un documento reducido a lo que importa para compararlo: sin la marca de
 * UTF-8, con saltos de línea iguales y sin espacios ni líneas vacías al final.
 * Así, un fichero que solo ha pasado por otro sistema operativo o por un correo
 * sigue siendo "el mismo"; uno al que le han tocado una cifra, no.
 */
export function canonical(text: string): string {
  return text
    .replaceAll(BOM, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trimEnd()
}

/** `true` si los dos textos son el mismo documento. */
export function sameDocument(a: string, b: string): boolean {
  return canonical(a) === canonical(b)
}

/**
 * Las celdas de un CSV de los que escribe la web: separadas por `;`, entre
 * comillas, con las comillas de dentro dobladas.
 *
 * Solo lee lo que la propia web escribió y guardó, pero no se fía: una comilla
 * sin cerrar se toma hasta el final, y nunca lanza un error.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  let started = false
  const source = text.replaceAll(BOM, '')

  const endCell = (): void => {
    row.push(cell)
    cell = ''
    started = false
  }
  const endRow = (): void => {
    if (started || row.length > 0) {
      endCell()
      rows.push(row)
    }
    row = []
  }

  for (let index = 0; index < source.length; index += 1) {
    const char = source.charAt(index)

    if (quoted) {
      if (char !== '"') {
        cell += char
      } else if (source.charAt(index + 1) === '"') {
        cell += '"'
        index += 1
      } else {
        quoted = false
      }
    } else if (char === '"') {
      quoted = true
      started = true
    } else if (char === ';') {
      endCell()
      started = true
    } else if (char === '\n') {
      endRow()
    } else if (char !== '\r') {
      cell += char
      started = true
    }
  }

  endRow()

  return rows
}

/** Lo que precede a una clave de staff: se reconoce de un vistazo y en un buscador de secretos. */
const KEY_PREFIX = 's42'

/** La clave que se le da a la cuenta: `s42-<id>-<secreto>`. */
export function formatKey(id: number, secret: string): string {
  return `${KEY_PREFIX}-${id}-${secret}`
}

/** El id de la cuenta y el secreto de una clave, o `null` si no tiene esa forma. */
export function parseKey(raw: unknown): { id: number; secret: string } | null {
  if (typeof raw !== 'string' || raw.length > 200) return null

  const match = /^s42-(\d{1,9})-([A-Za-z0-9_-]{20,128})$/.exec(raw.trim())

  if (match === null) return null

  const id = Number(match[1])

  return id > 0 ? { id, secret: match[2] ?? '' } : null
}

/** El nombre de una cuenta de staff: corto, legible y sin nada raro. */
export const STAFF_NAME = /^[A-Za-z0-9][A-Za-z0-9 ._-]{1,38}[A-Za-z0-9]$/
