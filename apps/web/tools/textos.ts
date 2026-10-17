/**
 * Las tablas de textos de la web (`src/shared/i18n/textos/*.csv`).
 *
 * Son la única fuente de los textos: una fila por clave, con su contexto y el
 * texto en cada idioma. Se editan como una hoja de cálculo. Este fichero las
 * lee y las convierte, para Vite (`textosPlugin`) y para la comprobación de
 * `npm run textos` (`tools/textos-cli.ts`).
 *
 * Cada idioma llega a la web como un módulo aparte (`virtual:textos/en`): el
 * navegador solo descarga el que se usa, y el español, que es el de reserva.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const LANG_CODES = ['es', 'en', 'ca', 'eu'] as const
export type LangCode = (typeof LANG_CODES)[number]

const TEXTOS_DIR = fileURLToPath(new URL('../src/shared/i18n/textos', import.meta.url))

const HEADER = ['clave', 'contexto', ...LANG_CODES]

export type TextRow = {
  key: string
  /** Qué quiere decir y dónde sale, para quien traduce. */
  context: string
  text: Record<LangCode, string>
  /** La tabla (el tema) en la que está: `pizarras`, `comun`… */
  theme: string
  /** La línea de la tabla, para los mensajes de error. */
  line: number
}

/**
 * Lee un CSV (RFC 4180): comas, comillas dobles para lo que lleva comas o
 * saltos de línea y `""` para una comilla dentro.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index++) {
    const char = text.charAt(index)

    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"'
        index++
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

/** Los ficheros de tablas, por nombre de tema. */
function tableFiles(dir = TEXTOS_DIR): { theme: string; file: string }[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.csv'))
    .sort()
    .map((name) => ({ theme: name.slice(0, -'.csv'.length), file: join(dir, name) }))
}

/** Lee una tabla. Lanza un error que dice tabla y línea si algo no cuadra. */
export function readTable(theme: string, text: string): TextRow[] {
  const [header, ...rows] = parseCsv(text)

  if (header?.join() !== HEADER.join()) {
    throw new Error(`${theme}.csv: la cabecera tiene que ser ${HEADER.join(',')}`)
  }

  return rows
    .map((cells, index) => ({ cells, line: index + 2 }))
    .filter(({ cells }) => cells.some((cell) => cell.trim() !== ''))
    .map(({ cells, line }) => {
      if (cells.length !== HEADER.length) {
        throw new Error(
          `${theme}.csv:${line}: tiene ${cells.length} columnas y van ${HEADER.length}`,
        )
      }

      const [key = '', context = '', ...texts] = cells

      return {
        key: key.trim(),
        context: context.trim(),
        text: Object.fromEntries(LANG_CODES.map((lang, i) => [lang, texts[i] ?? ''])) as Record<
          LangCode,
          string
        >,
        theme,
        line,
      }
    })
}

/** Todas las tablas juntas. */
export function readTables(dir = TEXTOS_DIR): TextRow[] {
  return tableFiles(dir).flatMap(({ theme, file }) => readTable(theme, readFileSync(file, 'utf8')))
}

/** El diccionario de un idioma: solo lo que tiene texto (lo vacío cae al español). */
export function dictionaryOf(rows: readonly TextRow[], lang: LangCode): Record<string, string> {
  return Object.fromEntries(
    rows.filter((row) => row.text[lang] !== '').map((row) => [row.key, row.text[lang]]),
  )
}

const VIRTUAL = 'virtual:textos/'

/**
 * Plugin de Vite: `import es from 'virtual:textos/es'` da el diccionario del
 * español sacado de las tablas. Al tocar una tabla en `npm run dev`, la web se
 * recarga con el texto nuevo.
 */
export function textosPlugin() {
  return {
    name: 'sanatorio-textos',
    resolveId(id: string): string | undefined {
      return id.startsWith(VIRTUAL) ? `\0${id}` : undefined
    },
    load(this: { addWatchFile: (file: string) => void }, id: string): string | undefined {
      if (!id.startsWith(`\0${VIRTUAL}`)) return undefined

      const lang = id.slice(`\0${VIRTUAL}`.length)

      if (!(LANG_CODES as readonly string[]).includes(lang)) {
        throw new Error(`No hay tabla de textos para el idioma «${lang}»`)
      }

      for (const { file } of tableFiles()) this.addWatchFile(file)

      return `export default ${JSON.stringify(dictionaryOf(readTables(), lang as LangCode))}`
    },
  }
}
