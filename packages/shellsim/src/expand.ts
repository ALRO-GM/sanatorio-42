/**
 * Expansión de palabras, en el orden de bash: llaves (`{a,b}`, `{1..5}`),
 * tilde, variables (`$X`, `${X:-y}`, `${#X}`, `${X%.log}`…), `$(…)`,
 * aritmética (`$((…))`), división en palabras de lo que no va entre comillas
 * y comodines (`*`, `?`, `[…]`). Lo que va entre comillas simples no se toca;
 * entre dobles se expanden las variables pero no se divide ni se buscan
 * ficheros. Y, como en bash, un comodín que no encaja con nada se queda tal
 * cual.
 */

import type { Budget } from './limits.js'
import { LIMITS } from './limits.js'
import { ShellError } from './model.js'
import { skipParens } from './parse.js'

/** Lo que la expansión necesita de la shell. */
export type ExpandEnv = {
  budget: Budget
  get: (name: string) => string | undefined
  set: (name: string, value: string) => void
  positional: () => string[]
  special: (name: string) => string | undefined
  home: () => string
  /** Ejecuta `$(…)` y devuelve lo que escribió. */
  substitute: (src: string) => string
  /** Las rutas que encajan con un patrón (ya con `\` delante de lo que va entre comillas). */
  glob: (pattern: string) => string[]
  nounset: () => boolean
}

type Seg = { text: string; quoted: boolean; split: boolean }

/** Expansión de llaves, fuera de comillas: `a{b,c}d` → `abd acd`; `{1..3}` → `1 2 3`. */
function braces(raw: string): string[] {
  let depth = 0
  let open = -1
  let quote: string | null = null

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]

    if (quote !== null) {
      if (c === quote) quote = null
      else if (c === '\\' && quote === '"') i++
      continue
    }
    if (c === '\\') {
      i++
      continue
    }
    if (c === "'" || c === '"') quote = c
    else if (c === '$' && raw[i + 1] === '{') {
      const end = raw.indexOf('}', i)

      if (end > 0) i = end
    } else if (c === '{') {
      if (depth === 0) open = i
      depth++
    } else if (c === '}' && depth > 0) {
      depth--
      if (depth === 0) {
        const inner = raw.slice(open + 1, i)
        const before = raw.slice(0, open)
        const after = raw.slice(i + 1)
        const range = /^(-?\d+)\.\.(-?\d+)$/.exec(inner) ?? /^([a-z])\.\.([a-z])$/i.exec(inner)
        let options: string[] | null = null

        if (range !== null) {
          const [a = '', b = ''] = [range[1], range[2]]
          const numeric = /\d/.test(a)
          const from = numeric ? Number(a) : a.charCodeAt(0)
          const to = numeric ? Number(b) : b.charCodeAt(0)

          if (Math.abs(to - from) > LIMITS.loop)
            throw new ShellError(`peer4u-sandbox: {${inner}} da demasiadas palabras`)
          options = []
          for (let n = from; from <= to ? n <= to : n >= to; n += from <= to ? 1 : -1)
            options.push(numeric ? String(n) : String.fromCharCode(n))
        } else {
          const parts = splitTop(inner)

          if (parts.length > 1) options = parts
        }
        if (options !== null) {
          const out = options.flatMap((option) => braces(before + option + after))

          if (out.length > LIMITS.loop) throw new ShellError('peer4u-sandbox: demasiadas palabras')

          return out
        }
      }
    }
  }

  return [raw]
}

/** Parte por comas que no estén dentro de otras llaves. */
function splitTop(inner: string): string[] {
  const parts: string[] = []
  let depth = 0
  let last = 0

  for (let i = 0; i < inner.length; i++) {
    const c = inner[i]

    if (c === '{') depth++
    else if (c === '}') depth--
    else if (c === ',' && depth === 0) {
      parts.push(inner.slice(last, i))
      last = i + 1
    }
  }
  parts.push(inner.slice(last))

  return parts
}

/** Un patrón de comodines (`*`, `?`, `[…]`, `\x` literal) contra un nombre. */
export function globMatch(pattern: string, name: string, budget: Budget): boolean {
  // Dos punteros con vuelta atrás solo al último `*`: no hay patrón que lo cuelgue.
  let p = 0
  let n = 0
  let star = -1
  let mark = 0

  while (n < name.length) {
    budget.tick()

    const c = pattern[p]

    if (c === '*') {
      star = p++
      mark = n
      continue
    }

    const step = matchOne(pattern, p, name[n] ?? '')

    if (step > 0) {
      p += step
      n++
    } else if (star >= 0) {
      p = star + 1
      n = ++mark
    } else return false
  }
  while (pattern[p] === '*') p++

  return p === pattern.length
}

/** Si el carácter encaja en la posición `p` del patrón, cuánto avanza el patrón; si no, 0. */
function matchOne(pattern: string, p: number, ch: string): number {
  const c = pattern[p]

  if (c === undefined) return 0
  if (c === '?') return 1
  if (c === '\\') return pattern[p + 1] === ch ? 2 : 0
  if (c === '[') {
    const end = pattern.indexOf(']', p + 2)

    if (end < 0) return ch === '[' ? 1 : 0

    let body = pattern.slice(p + 1, end)
    const neg = body.startsWith('!') || body.startsWith('^')

    if (neg) body = body.slice(1)

    let hit = false

    for (const [, cls] of body.matchAll(/\[:(\w+):\]/g)) {
      const test: Record<string, RegExp> = {
        alpha: /[a-z]/i,
        digit: /\d/,
        alnum: /[a-z0-9]/i,
        upper: /[A-Z]/,
        lower: /[a-z]/,
        space: /\s/,
      }

      if (test[cls ?? '']?.test(ch) === true) hit = true
    }
    body = body.replace(/\[:\w+:\]/g, '')
    for (let i = 0; i < body.length; i++) {
      const a = body[i] ?? ''

      if (body[i + 1] === '-' && body[i + 2] !== undefined) {
        if (ch >= a && ch <= (body[i + 2] ?? '')) hit = true
        i += 2
      } else if (a === ch) hit = true
    }

    return hit !== neg ? end - p + 1 : 0
  }

  return c === ch ? 1 : 0
}

/** ¿Lleva comodines sin escapar? */
function hasGlob(pattern: string): boolean {
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]

    if (c === '\\') i++
    else if (c === '*' || c === '?') return true
    else if (c === '[' && pattern.indexOf(']', i + 2) > 0) return true
  }

  return false
}

const escapeGlob = (text: string): string => text.replace(/[*?[\]\\]/g, (c) => `\\${c}`)

/** Quita los `\` de un patrón sin comodines. */
const unescapeGlob = (pattern: string): string => pattern.replace(/\\(.)/g, '$1')

class Expander {
  private segs: Seg[] = []
  /** Campos de `"$@"`: cada argumento, uno aparte. */
  private atFields: string[] | null = null

  constructor(
    private readonly env: ExpandEnv,
    private readonly raw: string,
  ) {}

  run(): Seg[] {
    const raw = this.raw
    let i = 0

    if (raw === '~' || raw.startsWith('~/')) {
      this.push(this.env.home(), true, false)
      i = 1
    }
    while (i < raw.length) {
      const c = raw[i] ?? ''

      if (c === "'") {
        const end = raw.indexOf("'", i + 1)

        this.push(raw.slice(i + 1, end), true, false)
        i = end + 1
      } else if (c === '"') i = this.double(i + 1)
      else if (c === '\\') {
        this.push(raw[i + 1] ?? '', true, false)
        i += 2
      } else if (c === '$' || c === '`') i = this.dollar(i, false)
      else {
        this.push(c, false, false)
        i++
      }
    }

    return this.segs
  }

  fieldsOfAt(): string[] | null {
    return this.atFields
  }

  private push(text: string, quoted: boolean, split: boolean): void {
    this.env.budget.tick(1 + Math.floor(text.length / 64))
    this.segs.push({ text, quoted, split })
  }

  private double(start: number): number {
    let i = start
    const raw = this.raw

    while (i < raw.length && raw[i] !== '"') {
      const c = raw[i] ?? ''

      if (c === '\\' && '$`"\\\n'.includes(raw[i + 1] ?? '')) {
        this.push(raw[i + 1] ?? '', true, false)
        i += 2
      } else if (
        c === '$' &&
        raw.startsWith('$@', i) &&
        raw.slice(start - 1, start + 3) === '"$@"'
      ) {
        this.atFields = this.env.positional()
        i += 2
      } else if (c === '$' || c === '`') i = this.dollar(i, true)
      else {
        this.push(c, true, false)
        i++
      }
    }

    return i + 1
  }

  private dollar(i: number, quoted: boolean): number {
    const raw = this.raw
    const split = !quoted

    if (raw[i] === '`') {
      const end = raw.indexOf('`', i + 1)

      this.push(this.env.substitute(raw.slice(i + 1, end)), quoted, split)

      return end + 1
    }
    if (raw.startsWith('$((', i)) {
      const end = skipParens(raw, i + 1)

      this.push(String(arith(raw.slice(i + 3, end - 2), this.env)), quoted, split)

      return end
    }
    if (raw[i + 1] === '(') {
      const end = skipParens(raw, i + 1)

      this.push(this.env.substitute(raw.slice(i + 2, end - 1)), quoted, split)

      return end
    }
    if (raw[i + 1] === '{') {
      const end = raw.indexOf('}', i + 2)

      this.push(this.param(raw.slice(i + 2, end)), quoted, split)

      return end + 1
    }

    const name = /^([A-Za-z_][A-Za-z0-9_]*|[0-9#?$!@*-])/.exec(raw.slice(i + 1))?.[1]

    if (name === undefined) {
      this.push('$', quoted, false)

      return i + 1
    }
    this.push(this.value(name), quoted, split)

    return i + 1 + name.length
  }

  private value(name: string): string {
    const special = this.env.special(name)

    if (special !== undefined) return special

    const value = this.env.get(name)

    if (value === undefined && this.env.nounset())
      throw new UnboundError(`bash: ${name}: unbound variable`)

    return value ?? ''
  }

  /** `${…}`: lo de bash que se usa en guiones. */
  private param(body: string): string {
    if (body.startsWith('#') && body.length > 1) return String(this.value(body.slice(1)).length)

    const op =
      /^([A-Za-z_][A-Za-z0-9_]*|[0-9#?$!@*])(:-|:=|:\+|:\?|-|=|\+|%%|%|##|#|\/\/|\/|:)?(.*)$/s.exec(
        body,
      )

    if (op === null) throw new ShellError(`bash: \${${body}}: bad substitution`)

    const [, name = '', kind, rest = ''] = op
    const special = this.env.special(name)
    const current = special ?? this.env.get(name)
    const value = current ?? ''
    const word = (text: string) => unescapeGlob(text)

    switch (kind) {
      case undefined:
        return this.value(name)
      case ':-':
        return value === '' ? this.inner(rest) : value
      case '-':
        return current === undefined ? this.inner(rest) : value
      case ':=':
        if (value === '') this.env.set(name, this.inner(rest))

        return this.env.get(name) ?? ''
      case ':+':
        return value === '' ? '' : this.inner(rest)
      case '+':
        return current === undefined ? '' : this.inner(rest)
      case ':?':
        if (value === '')
          throw new UnboundError(`bash: ${name}: ${rest || 'parameter null or not set'}`)

        return value
      case '%':
      case '%%':
        return trimEnd(value, this.inner(rest), kind === '%%', this.env.budget)
      case '#':
      case '##':
        return trimStart(value, this.inner(rest), kind === '##', this.env.budget)
      case '/':
      case '//': {
        const [pattern = '', replacement = ''] = rest.split('/')

        return kind === '//'
          ? value.split(word(pattern)).join(replacement)
          : value.replace(word(pattern), replacement)
      }
      case ':': {
        const [from = '0', length] = rest.split(':')
        const start = Number(from.trim())
        const begin = start < 0 ? Math.max(0, value.length + start) : start

        return length === undefined
          ? value.slice(begin)
          : value.slice(begin, begin + Number(length))
      }
      default:
        return value
    }
  }

  private inner(text: string): string {
    return fieldsText(expandWord(text, this.env, { split: false, glob: false }))
  }
}

export class UnboundError extends Error {}

function trimEnd(value: string, pattern: string, longest: boolean, budget: Budget): string {
  const order = [...Array(value.length + 1).keys()]

  for (const at of longest ? order : order.reverse())
    if (globMatch(pattern, value.slice(at), budget)) return value.slice(0, at)

  return value
}

function trimStart(value: string, pattern: string, longest: boolean, budget: Budget): string {
  const order = [...Array(value.length + 1).keys()]

  for (const at of longest ? order.reverse() : order)
    if (globMatch(pattern, value.slice(0, at), budget)) return value.slice(at)

  return value
}

const fieldsText = (fields: string[]): string => fields.join(' ')

/**
 * Expande una palabra en crudo a sus campos. `split: false` para las
 * asignaciones (`x=$y` no se divide); `glob: false` para lo que no busca
 * ficheros (el lado derecho de `case`, `[[`).
 */
export function expandWord(
  raw: string,
  env: ExpandEnv,
  opts: { split: boolean; glob: boolean } = { split: true, glob: true },
): string[] {
  const out: string[] = []

  for (const variant of braces(raw)) {
    const expander = new Expander(env, variant)
    const segs = expander.run()
    const at = expander.fieldsOfAt()

    if (at !== null) {
      // `"$@"`: lo de delante va pegado al primero y lo de detrás al último.
      out.push(...at)
      continue
    }

    // Campos con su patrón: lo de entre comillas, escapado para los comodines.
    const fields: { text: string; pattern: string; any: boolean }[] = []
    let current = { text: '', pattern: '', any: false }
    let started = false

    for (const seg of segs) {
      if (seg.quoted) started = true
      if (!seg.split || !opts.split) {
        current.text += seg.text
        current.pattern += seg.quoted ? escapeGlob(seg.text) : seg.text
        current.any ||= seg.quoted || seg.text !== ''
        continue
      }

      const pieces = seg.text.split(/[ \t\n]+/)

      pieces.forEach((piece, index) => {
        if (index > 0 && (current.any || current.text !== '' || started)) {
          fields.push(current)
          current = { text: '', pattern: '', any: false }
          started = false
        }
        current.text += piece
        current.pattern += piece
        if (piece !== '') current.any = true
      })
    }
    if (current.any || current.text !== '' || started) fields.push(current)
    for (const field of fields) {
      if (opts.glob && hasGlob(field.pattern)) {
        const found = env.glob(field.pattern)

        if (found.length > 0) {
          out.push(...found)
          continue
        }
      }
      out.push(field.text)
    }
  }
  if (out.length > LIMITS.loop * 2) throw new ShellError('peer4u-sandbox: demasiadas palabras')

  return out
}

/** Un patrón de `case` o `[[ == ]]`: lo de entre comillas, literal. */
export function expandPattern(raw: string, env: ExpandEnv): string {
  const segs = new Expander(env, raw).run()

  return segs.map((seg) => (seg.quoted ? escapeGlob(seg.text) : seg.text)).join('')
}

/* ---------- Aritmética: $(( )), (( )), let ---------- */

type ArithEnv = Pick<ExpandEnv, 'get' | 'set' | 'budget' | 'special'>

/** Evalúa una expresión aritmética de bash (enteros). */
export function arith(src: string, env: ArithEnv): number {
  const tokens =
    src.match(
      /\d+|[A-Za-z_][A-Za-z0-9_]*|\$\{?[A-Za-z_0-9#?]+\}?|\*\*|<=|>=|==|!=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|%=|<<|>>|[-+*/%()<>!=?:,&|^~]|\S/g,
    ) ?? []
  let pos = 0
  const peek = () => tokens[pos]
  const next = () => tokens[pos++]
  const fail = (): never => {
    throw new ArithError(`bash: ${src.trim()}: syntax error in expression`)
  }
  const varName = (token: string) => token.replace(/^\$\{?|\}$/g, '')
  const read = (name: string): number => {
    const value = env.special(name) ?? env.get(name) ?? '0'
    const number = Number(value.trim() === '' ? 0 : value)

    return Number.isFinite(number) ? Math.trunc(number) : 0
  }
  const toInt = (n: number): number => {
    if (!Number.isFinite(n)) throw new ArithError('bash: division by 0 (error token is "0")')

    return Math.trunc(n)
  }

  const binary: Record<string, [number, (a: number, b: number) => number]> = {
    '||': [1, (a, b) => (a !== 0 || b !== 0 ? 1 : 0)],
    '&&': [2, (a, b) => (a !== 0 && b !== 0 ? 1 : 0)],
    '|': [3, (a, b) => a | b],
    '^': [4, (a, b) => a ^ b],
    '&': [5, (a, b) => a & b],
    '==': [6, (a, b) => (a === b ? 1 : 0)],
    '!=': [6, (a, b) => (a !== b ? 1 : 0)],
    '<': [7, (a, b) => (a < b ? 1 : 0)],
    '>': [7, (a, b) => (a > b ? 1 : 0)],
    '<=': [7, (a, b) => (a <= b ? 1 : 0)],
    '>=': [7, (a, b) => (a >= b ? 1 : 0)],
    '<<': [8, (a, b) => a << b],
    '>>': [8, (a, b) => a >> b],
    '+': [9, (a, b) => a + b],
    '-': [9, (a, b) => a - b],
    '*': [10, (a, b) => a * b],
    '/': [
      10,
      (a, b) => {
        if (b === 0) throw new ArithError('bash: division by 0 (error token is "0")')

        return toInt(a / b)
      },
    ],
    '%': [
      10,
      (a, b) => {
        if (b === 0) throw new ArithError('bash: division by 0 (error token is "0")')

        return a % b
      },
    ],
    '**': [11, (a, b) => toInt(a ** Math.min(b, 64))],
  }

  function unary(): number {
    env.budget.tick()

    const token = next()

    if (token === undefined) return fail()
    if (token === '(') {
      const value = assign()

      if (next() !== ')') fail()

      return value
    }
    if (token === '-') return -unary()
    if (token === '+') return unary()
    if (token === '!') return unary() === 0 ? 1 : 0
    if (token === '~') return ~unary()
    if (token === '++' || token === '--') {
      const name = varName(next() ?? '')
      const value = read(name) + (token === '++' ? 1 : -1)

      env.set(name, String(value))

      return value
    }
    if (/^\d+$/.test(token)) return Number(token)
    if (/^\$?\{?[A-Za-z_0-9#?]/.test(token)) {
      const name = varName(token)

      if (peek() === '++' || peek() === '--') {
        const old = read(name)

        env.set(name, String(old + (next() === '++' ? 1 : -1)))

        return old
      }

      return read(name)
    }

    return fail()
  }

  function climb(min: number): number {
    let left = unary()

    for (;;) {
      const op = peek()
      const rule = op === undefined ? undefined : binary[op]

      if (rule === undefined || rule[0] < min) break
      next()

      const right = climb(op === '**' ? rule[0] : rule[0] + 1)

      left = toInt(rule[1](left, right))
    }

    return left
  }

  function ternary(): number {
    const cond = climb(1)

    if (peek() !== '?') return cond
    next()

    const a = assign()

    if (next() !== ':') fail()

    const b = assign()

    return cond !== 0 ? a : b
  }

  function assign(): number {
    const token = peek()
    const op = tokens[pos + 1]

    if (
      token !== undefined &&
      /^[A-Za-z_][A-Za-z0-9_]*$/.test(token) &&
      op !== undefined &&
      ['=', '+=', '-=', '*=', '/=', '%='].includes(op)
    ) {
      pos += 2

      const value = assign()
      const old = read(token)
      const result =
        op === '='
          ? value
          : op === '+='
            ? old + value
            : op === '-='
              ? old - value
              : op === '*='
                ? old * value
                : op === '/='
                  ? (binary['/']?.[1](old, value) ?? 0)
                  : (binary['%']?.[1](old, value) ?? 0)

      env.set(token, String(result))

      return result
    }

    return ternary()
  }

  if (tokens.length === 0) return 0

  let value = assign()

  while (peek() === ',') {
    next()
    value = assign()
  }
  if (pos < tokens.length) fail()

  return value
}

export class ArithError extends Error {}
