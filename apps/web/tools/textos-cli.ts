/**
 * `npm run textos`: comprueba las tablas de textos contra el código y deja al
 * día su versión legible en `docs/textos/`.
 *
 *   npm run textos            comprueba (lo hace `npm run check`)
 *   npm run textos -- --write además, reescribe docs/textos/
 *
 * Falla si:
 * - una tabla está mal formada o repite una clave;
 * - el código pide una clave que no está en ninguna tabla;
 * - hay una clave en las tablas que el código no usa;
 * - una traducción no conserva los huecos del español (`{login}`, `{n}`…);
 * - una clave no tiene contexto;
 * - `docs/textos/` no está al día con las tablas.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { LANG_CODES, readGroup, tableGroups } from './textos.ts'
import type { TextRow } from './textos.ts'

const WEB = fileURLToPath(new URL('..', import.meta.url))
const REPO = join(WEB, '../..')
const SRC = join(WEB, 'src')
const DOCS = join(REPO, 'docs/textos')

const LANG_NAMES: Record<string, string> = {
  es: 'Español',
  en: 'Inglés',
  ca: 'Catalán',
  eu: 'Euskera',
}

/** Lo que se queda en español a propósito en los demás idiomas. */
const SPANISH_ONLY = /^(admin|quota|staff)\./

/** Todos los ficheros de código de la web, sin la API de mentira. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)

    if (entry.isDirectory()) return entry.name === 'mock' ? [] : sourceFiles(path)

    return /\.(ts|tsx)$/.test(entry.name) ? [path] : []
  })
}

type Usage = {
  /** Clave → ficheros donde sale. */
  used: Map<string, Set<string>>
  /** Claves pedidas con `t('…')` literal que no existen, con su fichero. */
  missing: { key: string; file: string }[]
}

/**
 * Dónde se usa cada clave. Cuenta:
 * - cualquier cadena literal que sea una clave (`t('cal.join')`, o
 *   `label: 'cal.join'` que luego pasa por `t`);
 * - una plantilla con hueco (`` t(`nav.${id}`) ``) usa todas las claves que
 *   empiezan como ella y acaban como ella.
 */
function usageIn(rows: readonly TextRow[]): Usage {
  const keys = new Set(rows.map((row) => row.key))
  const used = new Map<string, Set<string>>()
  const missing: Usage['missing'] = []
  const mark = (key: string, file: string): void => {
    const files = used.get(key) ?? new Set<string>()

    files.add(file)
    used.set(key, files)
  }

  for (const path of sourceFiles(SRC)) {
    const file = relative(WEB, path)
    const code = readFileSync(path, 'utf8')

    for (const [, literal = ''] of code.matchAll(/['"]([a-zA-Z][\w-]*(?:\.[\w-]+)+)['"]/g)) {
      if (keys.has(literal)) mark(literal, file)
    }

    for (const [, literal = ''] of code.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)) {
      if (!keys.has(literal)) missing.push({ key: literal, file })
    }

    // Un prefijo que se pide entero (`tree('cheer.ask')`, `unflatten(dict,
    // 'game')`) usa todo lo que cuelga de él.
    const prefixes = [
      ...[...code.matchAll(/['"]([a-zA-Z][\w-]*(?:\.[\w-]+)+)['"]/g)].map(
        (match) => match[1] ?? '',
      ),
      ...[...code.matchAll(/unflatten\([\s\S]*?,\s*['"]([\w.-]+)['"]\s*\)/g)].map(
        (match) => match[1] ?? '',
      ),
    ]

    for (const prefix of prefixes) {
      if (keys.has(prefix)) continue

      for (const key of keys) {
        if (key.startsWith(`${prefix}.`)) mark(key, file)
      }
    }

    for (const [, template = ''] of code.matchAll(/`([a-zA-Z][\w.-]*\$\{[^`]*)`/g)) {
      const [head = '', ...rest] = template.split(/\$\{[^}]*\}/)
      const tail = rest.at(-1) ?? ''

      if (!head.includes('.')) continue

      for (const key of keys) {
        if (key.startsWith(head) && key.endsWith(tail) && key.length > head.length + tail.length) {
          mark(key, file)
        }
      }
    }
  }

  return { used, missing }
}

/** Los huecos de un texto (`{login}`, `{n}`…), ordenados. */
const holes = (text: string): string => (text.match(/\{\w+\}/g) ?? []).sort().join()

/** Una celda de tabla Markdown: sin barras ni saltos que rompan la fila. */
const cell = (text: string): string => text.replaceAll('|', '\\|').replaceAll('\n', ' ')

function themeDoc(theme: string, rows: readonly TextRow[], usage: Usage): string {
  const lines = [
    `# Textos: ${theme}`,
    '',
    `Generado desde \`apps/web/src/shared/i18n/textos/${theme}.csv\` con`,
    '`npm run textos -- --write`. **No se edita a mano**: se edita la tabla.',
    '',
    `${rows.length} textos. «—» es que falta la traducción: sale en español.`,
    '',
    '| Clave | Contexto | Dónde | Español | Inglés | Catalán | Euskera |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ]

  for (const row of rows) {
    const where = [...(usage.used.get(row.key) ?? [])]
      .map((file) => file.replace(/^src\//, '').replace(/\.tsx?$/, ''))
      .sort()
      .join(', ')
    const texts = LANG_CODES.map((lang) => (row.text[lang] === '' ? '—' : cell(row.text[lang])))

    lines.push(`| \`${row.key}\` | ${cell(row.context)} | ${where} | ${texts.join(' | ')} |`)
  }

  return `${lines.join('\n')}\n`
}

function indexDoc(rows: readonly TextRow[]): string {
  const themes = [...new Set(rows.map((row) => row.theme))]
  const lines = [
    '# Textos de la web',
    '',
    'Índice de las tablas de textos, generado con `npm run textos -- --write`.',
    'Cómo se trabaja con ellas: [docs/textos.md](../textos.md).',
    '',
    `| Tema | Textos | ${LANG_CODES.filter((lang) => lang !== 'es')
      .map((lang) => `Falta en ${LANG_NAMES[lang] ?? lang}`)
      .join(' | ')} |`,
    `| --- | --- | ${LANG_CODES.filter((lang) => lang !== 'es')
      .map(() => '---')
      .join(' | ')} |`,
  ]

  for (const theme of themes) {
    const mine = rows.filter((row) => row.theme === theme)
    const missing = LANG_CODES.filter((lang) => lang !== 'es').map(
      (lang) => mine.filter((row) => row.text[lang] === '').length,
    )

    lines.push(`| [${theme}](${theme}.md) | ${mine.length} | ${missing.join(' | ')} |`)
  }

  lines.push(
    '',
    'El panel de gestión (`admin.*`, `quota.*`, `staff.*`) solo lo ve quien',
    'administra y se deja en español a propósito.',
  )

  return `${lines.join('\n')}\n`
}

function main(): void {
  const write = process.argv.includes('--write')
  const problems: string[] = []
  // Las tablas de la web y las de cada grupo (`juego/`), todas juntas.
  const rows = ['', ...tableGroups()].flatMap(readGroup)
  const seen = new Map<string, TextRow>()

  for (const row of rows) {
    const where = `${row.theme}.csv:${row.line}`
    const before = seen.get(row.key)

    if (before !== undefined) {
      problems.push(`${where}: «${row.key}» ya está en ${before.theme}.csv:${before.line}`)
    }
    seen.set(row.key, row)

    if (!/^[a-zA-Z][\w-]*(\.[\w-]+)+$/.test(row.key)) {
      problems.push(`${where}: «${row.key}» no parece una clave (tema.algo)`)
    }
    if (row.text.es.trim() === '') problems.push(`${where}: «${row.key}» no tiene texto en español`)
    if (row.context === '') problems.push(`${where}: «${row.key}» no tiene contexto`)

    for (const lang of LANG_CODES) {
      const text = row.text[lang]

      if (text !== '' && text !== text.trim()) {
        problems.push(`${where}: «${row.key}» en ${lang} empieza o acaba con espacios`)
      }
      if (lang !== 'es' && text !== '' && holes(text) !== holes(row.text.es)) {
        problems.push(
          `${where}: «${row.key}» en ${lang} tiene los huecos ${holes(text) || 'ninguno'} y el español ${holes(row.text.es) || 'ninguno'}`,
        )
      }
      if (lang === 'en' && text === '' && !SPANISH_ONLY.test(row.key)) {
        problems.push(`${where}: «${row.key}» no está traducida al inglés`)
      }
    }
  }

  const usage = usageIn(rows)

  for (const { key, file } of usage.missing) {
    problems.push(`${file}: pide «${key}», que no está en ninguna tabla`)
  }
  for (const row of rows) {
    if (!usage.used.has(row.key)) {
      problems.push(`${row.theme}.csv:${row.line}: «${row.key}» no la usa nadie; bórrala`)
    }
  }

  // La versión legible, por tema, y su índice.
  const docs = new Map<string, string>([['README.md', indexDoc(rows)]])

  for (const theme of new Set(rows.map((row) => row.theme))) {
    docs.set(
      `${theme}.md`,
      themeDoc(
        theme,
        rows.filter((row) => row.theme === theme),
        usage,
      ),
    )
  }

  if (write) {
    rmSync(DOCS, { recursive: true, force: true })
    mkdirSync(DOCS, { recursive: true })
    for (const [name, text] of docs) writeFileSync(join(DOCS, name), text)
  } else {
    const stale = [...docs].filter(
      ([name, text]) =>
        !existsSync(join(DOCS, name)) || readFileSync(join(DOCS, name), 'utf8') !== text,
    )
    const extra = existsSync(DOCS) ? readdirSync(DOCS).filter((name) => !docs.has(name)) : []

    for (const [name] of stale) problems.push(`docs/textos/${name} no está al día`)
    for (const name of extra) problems.push(`docs/textos/${name} sobra`)
    if (stale.length > 0 || extra.length > 0) {
      problems.push('Para ponerla al día: npm run textos -- --write')
    }
  }

  if (problems.length > 0) {
    process.stderr.write(`${problems.join('\n')}\n\n${problems.length} problemas en los textos.\n`)
    process.exit(1)
  }

  process.stdout.write(`Textos en orden: ${rows.length} claves en ${docs.size - 1} tablas.\n`)
}

main()
