/**
 * El `jsonpath` de kubectl, lo que se usa a diario: `{.spec.replicas}`,
 * `{.items[*].metadata.name}`, `{.data.POSTGRES_PASSWORD}`,
 * `{.data.tls\.crt}`, `{.status.conditions[?(@.type=="Ready")].status}` y
 * `{range .items[*]}{.metadata.name}{"\n"}{end}`.
 */

import { Fail } from '@sanatorio/shellsim'

import type { Json } from './model.js'

type Token = { kind: 'text'; text: string } | { kind: 'expr'; text: string }

function tokens(template: string): Token[] {
  const out: Token[] = []
  let i = 0

  while (i < template.length) {
    const open = template.indexOf('{', i)

    if (open < 0) {
      out.push({ kind: 'text', text: template.slice(i) })
      break
    }
    if (open > i) out.push({ kind: 'text', text: template.slice(i, open) })

    let depth = 0
    let quote: string | null = null
    let end = -1

    for (let j = open; j < template.length; j++) {
      const c = template[j]

      if (quote !== null) {
        if (c === quote) quote = null
        continue
      }
      if (c === '"' || c === "'") quote = c
      else if (c === '{') depth++
      else if (c === '}') {
        depth--
        if (depth === 0) {
          end = j
          break
        }
      }
    }
    if (end < 0) throw new Fail(`error: error parsing jsonpath ${template}, unclosed action`, 1)
    out.push({ kind: 'expr', text: template.slice(open + 1, end).trim() })
    i = end + 1
  }

  return out
}

/** Los pasos de una ruta: `.a.b`, `[0]`, `[*]`, `['x']`, `.tls\.crt`, `[?(@.k=="v")]`. */
function steps(path: string): string[] {
  const out: string[] = []
  let i = 0

  while (i < path.length) {
    const c = path[i]

    if (c === '@' || c === '$') {
      i++
      continue
    }
    if (c === '.') {
      let name = ''

      i++
      while (i < path.length && path[i] !== '.' && path[i] !== '[') {
        if (path[i] === '\\' && i + 1 < path.length) {
          name += path[i + 1] ?? ''
          i += 2
          continue
        }
        name += path[i] ?? ''
        i++
      }
      if (name !== '') out.push(`.${name}`)
      continue
    }
    if (c === '[') {
      const end = path.indexOf(']', i)

      if (end < 0) throw new Fail(`error: error parsing jsonpath ${path}, unterminated array`, 1)
      out.push(path.slice(i, end + 1))
      i = end + 1
      continue
    }
    throw new Fail(
      `error: error parsing jsonpath {${path}}, unrecognized character in action: U+${(c ?? '').charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
      1,
    )
  }

  return out
}

function walk(values: Json[], path: string): Json[] {
  let current = values

  for (const step of steps(path)) {
    const next: Json[] = []

    for (const value of current) {
      if (value === null || typeof value !== 'object') continue
      if (step.startsWith('.')) {
        const key = step.slice(1)

        if (key === '*') next.push(...(Array.isArray(value) ? value : Object.values(value)))
        else if (!Array.isArray(value) && Object.hasOwn(value, key)) next.push(value[key] ?? null)
        continue
      }

      const inner = step.slice(1, -1).trim()

      if (inner === '*') next.push(...(Array.isArray(value) ? value : Object.values(value)))
      else if (/^-?\d+$/.test(inner)) {
        if (Array.isArray(value)) {
          const index = Number(inner)
          const item = value[index < 0 ? value.length + index : index]

          if (item !== undefined) next.push(item)
        }
      } else if (/^['"].*['"]$/.test(inner)) {
        const key = inner.slice(1, -1)

        if (!Array.isArray(value) && Object.hasOwn(value, key)) next.push(value[key] ?? null)
      } else if (inner.startsWith('?(')) {
        const filter = /^\?\(@\.([\w.]+)\s*(==|!=)\s*["']?([^"')]*)["']?\)$/.exec(inner)

        if (filter === null)
          throw new Fail(`error: error parsing jsonpath, unsupported filter ${inner}`, 1)
        for (const item of Array.isArray(value) ? value : []) {
          const [found] = walk([item], `.${filter[1] ?? ''}`)
          const same =
            (typeof found === 'object' ? JSON.stringify(found) : String(found)) === filter[3]

          if (found !== undefined && (filter[2] === '==' ? same : !same)) next.push(item)
        }
      }
    }
    current = next
  }

  return current
}

const show = (value: Json): string =>
  value === null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)

/** Aplica una plantilla de jsonpath a un objeto (o a una lista con `items`). */
export function jsonpath(template: string, root: Json): string {
  const list = tokens(template.replace(/^'|'$/g, ''))
  const run = (items: Token[], context: Json): string => {
    let text = ''

    for (let j = 0; j < items.length; j++) {
      const token = items[j]

      if (token === undefined) continue
      if (token.kind === 'text') {
        text += token.text
        continue
      }
      if (token.text.startsWith('range ')) {
        let depth = 1
        let end = j + 1

        for (; end < items.length; end++) {
          const t = items[end]

          if (t?.kind === 'expr' && t.text.startsWith('range ')) depth++
          if (t?.kind === 'expr' && t.text === 'end') depth--
          if (depth === 0) break
        }

        const body = items.slice(j + 1, end)

        for (const item of walk([context], token.text.slice(6).trim())) text += run(body, item)
        j = end
        continue
      }
      if (/^".*"$|^'.*'$/.test(token.text)) {
        text += token.text.slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t')
        continue
      }
      text += walk([context], token.text).map(show).join(' ')
    }

    return text
  }

  return run(list, root)
}
