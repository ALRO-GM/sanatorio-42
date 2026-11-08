/**
 * Un YAML pequeño, lo justo para un compose.yaml: mapas y listas en bloque,
 * listas y mapas en línea (`[a, b]`, `{a: b}`), textos con y sin comillas,
 * comentarios y textos de varias líneas (`|` y `>`). Todo valor es un texto
 * (o `null`): compose ya sabe qué espera en cada sitio. Sin anclas ni
 * etiquetas, que en un compose de trabajo casi no salen. Recorre cada línea
 * una vez y tiene tope de tamaño y de profundidad: nada de lo que se escriba
 * lo cuelga.
 */

import { LIMITS, safeKey } from './limits.js'

export type Yaml = string | null | Yaml[] | { [key: string]: Yaml }

export class YamlError extends Error {}

type Line = { n: number; indent: number; text: string }

/** Quita un comentario (`# …` fuera de comillas) del final de una línea. */
function uncomment(line: string): string {
  let quote: string | null = null

  for (let i = 0; i < line.length; i++) {
    const c = line[i]

    if (quote !== null) {
      if (c === quote) quote = null
      else if (c === '\\' && quote === '"') i++
    } else if (c === '"' || c === "'") quote = c
    else if (c === '#' && (i === 0 || /\s/.test(line[i - 1] ?? ''))) return line.slice(0, i)
  }

  return line
}

/** Un texto suelto: con comillas dobles (escapes), simples (`''`) o sin ellas. */
function scalar(raw: string): string | null {
  const text = raw.trim()

  if (text === '' || text === '~' || text === 'null') return null
  if (text.startsWith('"') && text.endsWith('"') && text.length >= 2)
    return text
      .slice(1, -1)
      .replace(/\\(["\\nt])/g, (_, c: string) => (c === 'n' ? '\n' : c === 't' ? '\t' : c))
  if (text.startsWith("'") && text.endsWith("'") && text.length >= 2)
    return text.slice(1, -1).replace(/''/g, "'")

  return text
}

/** Divide `a, "b, c", [d, e]` por las comas de este nivel. */
function splitFlow(inner: string, line: number): string[] {
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let start = 0

  for (let i = 0; i < inner.length; i++) {
    const c = inner[i]

    if (quote !== null) {
      if (c === quote) quote = null
      else if (c === '\\' && quote === '"') i++
      continue
    }
    if (c === '"' || c === "'") quote = c
    else if (c === '[' || c === '{') depth++
    else if (c === ']' || c === '}') depth--
    else if (c === ',' && depth === 0) {
      parts.push(inner.slice(start, i))
      start = i + 1
    }
    if (depth < 0) throw new YamlError(`line ${line}: unexpected '${c ?? ''}'`)
  }
  if (quote !== null || depth !== 0) throw new YamlError(`line ${line}: unclosed flow collection`)
  parts.push(inner.slice(start))

  return parts.map((part) => part.trim()).filter((part) => part !== '')
}

/** El `:` que separa clave y valor (fuera de comillas y seguido de espacio o del final). */
function colonAt(text: string): number {
  let quote: string | null = null

  for (let i = 0; i < text.length; i++) {
    const c = text[i]

    if (quote !== null) {
      if (c === quote) quote = null
      continue
    }
    if (c === '"' || c === "'") quote = c
    else if (c === '[' || c === '{') return -1
    else if (c === ':' && (i + 1 === text.length || text[i + 1] === ' ')) return i
  }

  return -1
}

function flow(text: string, line: number, depth: number): Yaml {
  if (depth > LIMITS.yamlDepth) throw new YamlError(`line ${line}: too deeply nested`)

  const value = text.trim()

  if (value.startsWith('[')) {
    if (!value.endsWith(']')) throw new YamlError(`line ${line}: unclosed '['`)

    return splitFlow(value.slice(1, -1), line).map((part) => flow(part, line, depth + 1))
  }
  if (value.startsWith('{')) {
    if (!value.endsWith('}')) throw new YamlError(`line ${line}: unclosed '{'`)

    const out: Record<string, Yaml> = {}

    for (const part of splitFlow(value.slice(1, -1), line)) {
      const at = colonAt(part)

      if (at < 0) out[safeKey(scalar(part) ?? '', 'clave')] = null
      else
        out[safeKey(scalar(part.slice(0, at)) ?? '', 'clave')] = flow(
          part.slice(at + 1),
          line,
          depth + 1,
        )
    }

    return out
  }

  return scalar(value)
}

class Parser {
  private pos = 0

  constructor(private readonly lines: Line[]) {}

  parse(): Yaml {
    if (this.lines.length === 0) return null

    const value = this.block(this.lines[0]?.indent ?? 0, 0)

    if (this.pos < this.lines.length) {
      const line = this.lines[this.pos]

      throw new YamlError(`line ${line?.n ?? 0}: did not find expected key`)
    }

    return value
  }

  private block(indent: number, depth: number): Yaml {
    if (depth > LIMITS.yamlDepth)
      throw new YamlError(`line ${this.lines[this.pos]?.n ?? 0}: too deeply nested`)

    const first = this.lines[this.pos]

    if (first === undefined) return null
    if (first.text === '-' || first.text.startsWith('- ')) return this.sequence(indent, depth)

    return this.mapping(indent, depth)
  }

  private sequence(indent: number, depth: number): Yaml[] {
    const out: Yaml[] = []

    for (let line = this.lines[this.pos]; line !== undefined; line = this.lines[this.pos]) {
      if (line.indent < indent) break
      if (line.indent > indent) throw new YamlError(`line ${line.n}: bad indentation`)
      if (!(line.text === '-' || line.text.startsWith('- '))) break

      const rest = line.text.slice(1).trim()

      if (rest === '') {
        this.pos++

        const next = this.lines[this.pos]

        out.push(
          next !== undefined && next.indent > indent ? this.block(next.indent, depth + 1) : null,
        )
        continue
      }

      // `- clave: valor` abre un mapa cuyas demás claves van más adentro.
      if (colonAt(rest) > 0 && !rest.startsWith('"') && !rest.startsWith("'")) {
        const inner = indent + (line.text.length - rest.length)

        this.lines[this.pos] = { n: line.n, indent: inner, text: rest }
        out.push(this.mapping(inner, depth + 1))
        continue
      }
      this.pos++
      out.push(flow(rest, line.n, depth))
    }

    return out
  }

  private mapping(indent: number, depth: number): Record<string, Yaml> {
    const out: Record<string, Yaml> = {}

    for (let line = this.lines[this.pos]; line !== undefined; line = this.lines[this.pos]) {
      if (line.indent < indent) break
      if (line.indent > indent) throw new YamlError(`line ${line.n}: bad indentation`)
      if (line.text.startsWith('- ')) break

      const at = colonAt(line.text)

      if (at < 0) throw new YamlError(`line ${line.n}: could not find expected ':'`)

      const key = safeKey(scalar(line.text.slice(0, at)) ?? '', 'clave')
      const rest = line.text.slice(at + 1).trim()

      if (Object.hasOwn(out, key))
        throw new YamlError(`line ${line.n}: mapping key "${key}" already defined`)
      this.pos++
      if (rest === '|' || rest === '>' || rest === '|-' || rest === '>-') {
        out[key] = this.text(indent, rest)
        continue
      }
      if (rest !== '') {
        out[key] = flow(rest, line.n, depth)
        continue
      }

      const next = this.lines[this.pos]

      // Una lista puede ir a la misma altura que su clave (`ports:` y debajo `- "80:80"`).
      if (
        next !== undefined &&
        (next.indent > indent || (next.indent === indent && next.text.startsWith('- ')))
      )
        out[key] = this.block(next.indent, depth + 1)
      else out[key] = null
    }

    return out
  }

  /** Un texto en bloque: `|` guarda los saltos de línea; `>` los junta con espacios. */
  private text(indent: number, style: string): string {
    const parts: string[] = []

    for (let line = this.lines[this.pos]; line !== undefined; line = this.lines[this.pos]) {
      if (line.indent <= indent) break
      parts.push(line.text)
      this.pos++
    }

    const joined = style.startsWith('|') ? parts.join('\n') : parts.join(' ')

    return style.endsWith('-') ? joined : `${joined}\n`
  }
}

/** Lee un YAML; lanza `YamlError` con la línea si está mal escrito. */
export function parseYaml(source: string): Yaml {
  if (source.length > LIMITS.yamlChars)
    throw new YamlError(`the file is too big for this sandbox (max ${LIMITS.yamlChars} chars)`)

  const lines: Line[] = []

  source.split('\n').forEach((raw, index) => {
    if (raw.includes('\t') && /^\s*\t/.test(raw))
      throw new YamlError(`line ${index + 1}: found character that cannot start any token (a tab)`)

    const clean = uncomment(raw).replace(/\s+$/, '')

    if (clean.trim() === '' || clean.trim() === '---') return
    lines.push({
      n: index + 1,
      indent: clean.length - clean.trimStart().length,
      text: clean.trim(),
    })
  })

  return new Parser(lines).parse()
}

/** ¿Hace falta poner comillas para que se lea igual? */
function needsQuotes(text: string): boolean {
  return (
    text === '' ||
    /^[\s\-?:,[\]{}#&*!|>'"%@`]/.test(text) ||
    /: |\s#|\s$|\n/.test(text) ||
    /^(true|false|yes|no|null|~|\d[\d._:]*)$/i.test(text)
  )
}

const quoted = (text: string): string =>
  needsQuotes(text)
    ? `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
    : text

/** Escribe un valor como YAML en bloque (lo que enseña `docker compose config`). */
export function stringifyYaml(value: Yaml, indent = 0): string {
  const pad = ' '.repeat(indent)

  if (value === null) return 'null\n'
  if (typeof value === 'string') return `${quoted(value)}\n`
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]\n'

    return value
      .map((item) => {
        if (
          item !== null &&
          typeof item === 'object' &&
          !Array.isArray(item) &&
          Object.keys(item).length > 0
        ) {
          const body = stringifyYaml(item, indent + 2)

          return `${pad}- ${body.slice(indent + 2)}`
        }

        return `${pad}- ${stringifyYaml(item, indent + 2)}`
      })
      .join('')
  }

  const entries = Object.entries(value)

  if (entries.length === 0) return '{}\n'

  return entries
    .map(([key, item]) => {
      if (
        item !== null &&
        typeof item === 'object' &&
        (Array.isArray(item) ? item.length > 0 : Object.keys(item).length > 0)
      )
        return `${pad}${quoted(key)}:\n${stringifyYaml(item, indent + 2)}`

      return `${pad}${quoted(key)}: ${stringifyYaml(item, indent + 2)}`
    })
    .join('')
}

/** Un `.env`: `CLAVE=valor` por línea, con comentarios y comillas opcionales. */
export function parseDotenv(source: string): Record<string, string> {
  const out: Record<string, string> = {}

  if (source.length > LIMITS.yamlChars) throw new YamlError('the .env file is too big')
  for (const raw of source.split('\n')) {
    const line = raw.trim().replace(/^export\s+/, '')

    if (line === '' || line.startsWith('#')) continue

    const at = line.indexOf('=')

    if (at <= 0) continue

    const key = line.slice(0, at).trim()
    let value = line.slice(at + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1)
    else value = value.replace(/\s+#.*$/, '')
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) out[safeKey(key, 'variable')] = value
  }

  return out
}
