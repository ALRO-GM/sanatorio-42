/**
 * De lo que se escribe en la terminal a un árbol: el subconjunto de bash que
 * se usa de verdad al gestionar servidores. Tuberías (`|`), listas (`;`,
 * `&&`, `||`, `&`), redirecciones (`>`, `>>`, `<`, `2>`, `2>&1`, `&>`, `<<EOF`,
 * `<<<`), comillas, `if`/`elif`/`else`, `for`, `while`/`until`, `case`,
 * funciones, `{ …; }`, `( … )`, `[[ … ]]` y `(( … ))`.
 *
 * Las palabras se guardan en crudo (con sus comillas): se expanden al
 * ejecutarse (`expand.ts`), como hace bash. Si la orden está a medias (una
 * comilla sin cerrar, un `if` sin `fi`, un heredoc sin su final), se lanza
 * `Incomplete` y la terminal pide la línea siguiente con `>`.
 */

import { ShellError } from './model.js'

export class Incomplete extends Error {}

export type Word = string

export type Redir = {
  fd: number
  op: '>' | '>>' | '<' | '>&' | '&>' | '&>>' | '<<' | '<<<'
  target: Word
  /** El cuerpo de un heredoc y si lleva expansión (`<<EOF` sí, `<<'EOF'` no). */
  body?: { text: string; expand: boolean }
}

export type Simple = { t: 'simple'; assigns: Word[]; words: Word[]; redirs: Redir[]; line: string }
type If = { t: 'if'; clauses: { cond: List; body: List }[]; otherwise: List | null }
type For = { t: 'for'; name: string; items: Word[] | null; body: List }
type CFor = { t: 'cfor'; init: string; test: string; step: string; body: List }
type While = { t: 'while'; until: boolean; cond: List; body: List }
type Group = { t: 'group'; body: List; subshell: boolean }
export type Func = { t: 'func'; name: string; body: Command }
type Case = { t: 'case'; word: Word; arms: { patterns: Word[]; body: List }[] }
type Arith = { t: 'arith'; expr: string }
type Cond = { t: 'cond'; words: Word[] }

export type Compound = If | For | CFor | While | Group | Case | Arith | Cond
export type Command = Simple | Func | (Compound & { redirs: Redir[] })
export type Pipeline = { cmds: Command[]; neg: boolean }
export type AndOr = { first: Pipeline; rest: { op: '&&' | '||'; pipe: Pipeline }[]; bg: boolean }
export type List = AndOr[]

type Token =
  | { t: 'word'; v: string }
  | { t: 'op'; v: string; fd?: number; body?: { text: string; expand: boolean } }
  | { t: 'nl' }
  | { t: 'arith'; v: string }

const META = new Set([' ', '\t', '\n', ';', '&', '|', '<', '>', '(', ')'])

/** Lee una palabra en crudo, respetando comillas, `$(…)`, `${…}` y `` `…` ``. */
function readWord(src: string, start: number): number {
  let i = start

  while (i < src.length) {
    const c = src[i] ?? ''

    if (META.has(c)) break
    if (c === '\\') {
      if (i + 1 >= src.length) throw new Incomplete()
      i += 2
    } else if (c === "'") {
      const end = src.indexOf("'", i + 1)

      if (end < 0) throw new Incomplete()
      i = end + 1
    } else if (c === '"') i = skipDouble(src, i + 1)
    else if (c === '`') {
      const end = src.indexOf('`', i + 1)

      if (end < 0) throw new Incomplete()
      i = end + 1
    } else if (c === '$' && src[i + 1] === '(') i = skipParens(src, i + 1)
    else if (c === '$' && src[i + 1] === '{') {
      const end = src.indexOf('}', i + 2)

      if (end < 0) throw new Incomplete()
      i = end + 1
    } else i++
  }

  return i
}

/** Salta hasta la comilla doble que cierra (las de dentro de `$(…)` no cuentan). */
function skipDouble(src: string, start: number): number {
  let i = start

  while (i < src.length) {
    const c = src[i]

    if (c === '\\') i += 2
    else if (c === '"') return i + 1
    else if (c === '$' && src[i + 1] === '(') i = skipParens(src, i + 1)
    else i++
  }

  throw new Incomplete()
}

/** Desde un `(`, hasta su `)`, con paréntesis y comillas dentro. */
export function skipParens(src: string, open: number): number {
  let depth = 0
  let i = open

  while (i < src.length) {
    const c = src[i]

    if (c === '\\') i += 2
    else if (c === "'") {
      const end = src.indexOf("'", i + 1)

      if (end < 0) throw new Incomplete()
      i = end + 1
    } else if (c === '"') i = skipDouble(src, i + 1)
    else {
      if (c === '(') depth++
      if (c === ')') {
        depth--
        if (depth === 0) return i + 1
      }
      i++
    }
  }

  throw new Incomplete()
}

const OPS = [
  '&>>',
  '<<<',
  '<<-',
  '&&',
  '||',
  ';;',
  '>>',
  '<<',
  '>&',
  '&>',
  '<',
  '>',
  '|',
  '&',
  ';',
  '(',
  ')',
]

/** Quita las comillas de un delimitador de heredoc y dice si las tenía. */
function delimiter(raw: string): { word: string; quoted: boolean } {
  const quoted = /['"\\]/.test(raw)

  return { word: raw.replace(/['"\\]/g, ''), quoted }
}

function lex(src: string): Token[] {
  const tokens: Token[] = []
  const pending: {
    token: Extract<Token, { t: 'op' }>
    word: string
    quoted: boolean
    tabs: boolean
  }[] = []
  let i = 0

  while (i < src.length) {
    const c = src[i] ?? ''

    if (c === ' ' || c === '\t') {
      i++
      continue
    }
    if (c === '\\' && src[i + 1] === '\n') {
      i += 2
      continue
    }
    if (c === '#') {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }
    if (c === '\n') {
      tokens.push({ t: 'nl' })
      i++
      // Los heredocs pendientes se leen ahora: sus líneas hasta el delimitador.
      for (const doc of pending.splice(0)) {
        const lines: string[] = []

        for (;;) {
          if (i >= src.length) throw new Incomplete()

          const end = src.indexOf('\n', i)
          const line = src.slice(i, end < 0 ? src.length : end)

          i = end < 0 ? src.length : end + 1

          const bare = doc.tabs ? line.replace(/^\t+/, '') : line

          if (bare === doc.word) break
          lines.push(bare)
          if (end < 0) throw new Incomplete()
        }
        doc.token.body = { text: lines.map((line) => `${line}\n`).join(''), expand: !doc.quoted }
      }
      continue
    }
    if (c === '(' && src[i + 1] === '(') {
      const end = skipParens(src, i)
      const inner = src.slice(i + 2, end - 2)

      if (src[end - 2] !== ')') throw new ShellError('bash: syntax error near `((')
      tokens.push({ t: 'arith', v: inner })
      i = end
      continue
    }

    const op = OPS.find((each) => src.startsWith(each, i))

    if (op !== undefined) {
      i += op.length

      const token: Extract<Token, { t: 'op' }> = { t: 'op', v: op === '<<-' ? '<<' : op }

      tokens.push(token)
      if (op === '<<' || op === '<<-') {
        while (src[i] === ' ' || src[i] === '\t') i++

        const end = readWord(src, i)

        if (end === i) throw new ShellError("bash: syntax error near unexpected token `newline'")

        const { word, quoted } = delimiter(src.slice(i, end))

        pending.push({ token, word, quoted, tabs: op === '<<-' })
        i = end
      }
      continue
    }

    const end = readWord(src, i)
    const raw = src.slice(i, end)

    // `2>`, `2>>`, `2>&1`: un número pegado a una redirección es el descriptor.
    if (/^\d$/.test(raw) && (src[end] === '>' || src[end] === '<')) {
      const redir = OPS.find((each) => src.startsWith(each, end)) ?? '>'

      tokens.push({ t: 'op', v: redir, fd: Number(raw) })
      i = end + redir.length
      continue
    }
    tokens.push({ t: 'word', v: raw })
    i = end
  }
  if (pending.length > 0) throw new Incomplete()

  return tokens
}

const RESERVED_END = new Set(['then', 'else', 'elif', 'fi', 'do', 'done', 'esac', '}', ';;'])

class Parser {
  private pos = 0

  constructor(private readonly tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private isWord(value?: string): boolean {
    const token = this.peek()

    return token?.t === 'word' && (value === undefined || token.v === value)
  }

  private isOp(value: string): boolean {
    const token = this.peek()

    return token?.t === 'op' && token.v === value
  }

  private skipNewlines(): void {
    while (this.peek()?.t === 'nl') this.pos++
  }

  private expectWord(value: string): void {
    this.skipSeparators()
    if (this.peek() === undefined) throw new Incomplete()
    if (!this.isWord(value)) throw this.unexpected()
    this.pos++
  }

  private skipSeparators(): void {
    while (this.peek()?.t === 'nl' || this.isOp(';')) this.pos++
  }

  private unexpected(): ShellError {
    const token = this.peek()
    const text = token === undefined ? 'newline' : token.t === 'nl' ? 'newline' : token.v

    return new ShellError(`bash: syntax error near unexpected token \`${text}'`)
  }

  parseAll(): List {
    const list = this.list(new Set())

    if (this.peek() !== undefined) throw this.unexpected()

    return list
  }

  /** Una lista de órdenes hasta una palabra que cierra (`fi`, `done`…). */
  private list(until: Set<string>): List {
    const list: List = []

    for (;;) {
      this.skipSeparators()

      const token = this.peek()

      if (token === undefined) return list
      if (token.t === 'word' && until.has(token.v)) return list
      if (token.t === 'op' && (token.v === ')' || token.v === ';;')) return list
      if (token.t === 'word' && RESERVED_END.has(token.v) && !until.has(token.v))
        throw this.unexpected()
      list.push(this.andOr())
    }
  }

  private andOr(): AndOr {
    const first = this.pipeline()
    const rest: AndOr['rest'] = []

    while (this.isOp('&&') || this.isOp('||')) {
      const op = (this.peek() as { v: '&&' | '||' }).v

      this.pos++
      this.skipNewlines()
      if (this.peek() === undefined) throw new Incomplete()
      rest.push({ op, pipe: this.pipeline() })
    }

    let bg = false

    if (this.isOp('&')) {
      this.pos++
      bg = true
    } else if (this.isOp(';')) this.pos++

    return { first, rest, bg }
  }

  private pipeline(): Pipeline {
    let neg = false

    if (this.isWord('!')) {
      this.pos++
      neg = true
    }

    const cmds = [this.command()]

    while (this.isOp('|')) {
      this.pos++
      this.skipNewlines()
      if (this.peek() === undefined) throw new Incomplete()
      cmds.push(this.command())
    }

    return { cmds, neg }
  }

  private redirect(redirs: Redir[]): boolean {
    const token = this.peek()

    if (token?.t !== 'op' || !['>', '>>', '<', '>&', '&>', '&>>', '<<', '<<<'].includes(token.v))
      return false
    this.pos++

    const target = this.peek()

    if (target?.t !== 'word') {
      if (token.v === '<<' && token.body !== undefined) {
        redirs.push({ fd: 0, op: '<<', target: '', body: token.body })

        return true
      }
      if (target === undefined)
        throw new ShellError("bash: syntax error near unexpected token `newline'")
      throw this.unexpected()
    }
    this.pos++

    const op = token.v as Redir['op']
    const fd = token.fd ?? (op === '<' || op === '<<' || op === '<<<' ? 0 : 1)
    const redir: Redir = { fd, op, target: target.v }

    if (op === '<<') {
      if (token.body === undefined) throw new Incomplete()
      redir.body = token.body
    }
    redirs.push(redir)

    return true
  }

  private compoundRedirs<T extends Compound>(node: T): T & { redirs: Redir[] } {
    const redirs: Redir[] = []

    while (this.redirect(redirs));

    return { ...node, redirs }
  }

  private command(): Command {
    const token = this.peek()

    if (token === undefined) throw new Incomplete()
    if (token.t === 'arith') {
      this.pos++

      return this.compoundRedirs({ t: 'arith', expr: token.v })
    }
    if (token.t === 'op' && token.v === '(') {
      this.pos++

      const body = this.list(new Set())

      if (this.peek() === undefined) throw new Incomplete()
      if (!this.isOp(')')) throw this.unexpected()
      this.pos++

      return this.compoundRedirs({ t: 'group', body, subshell: true })
    }
    if (token.t === 'word') {
      switch (token.v) {
        case 'if':
          return this.compoundRedirs(this.ifClause())
        case 'for':
          return this.compoundRedirs(this.forClause())
        case 'while':
        case 'until':
          return this.compoundRedirs(this.whileClause(token.v === 'until'))
        case 'case':
          return this.compoundRedirs(this.caseClause())
        case '{': {
          this.pos++

          const body = this.list(new Set(['}']))

          this.expectWord('}')

          return this.compoundRedirs({ t: 'group', body, subshell: false })
        }
        case '[[':
          return this.compoundRedirs(this.condClause())
        case 'function': {
          this.pos++

          const name = this.peek()

          if (name?.t !== 'word') throw this.unexpected()
          this.pos++
          if (this.isOp('(')) {
            this.pos++
            if (!this.isOp(')')) throw this.unexpected()
            this.pos++
          }
          this.skipNewlines()

          return { t: 'func', name: name.v.replace(/\(\)$/, ''), body: this.command() }
        }
        default:
          break
      }

      // `nombre() { … }`
      const next = this.tokens[this.pos + 1]
      const after = this.tokens[this.pos + 2]

      if (next?.t === 'op' && next.v === '(' && after?.t === 'op' && after.v === ')') {
        this.pos += 3
        this.skipNewlines()
        if (this.peek() === undefined) throw new Incomplete()

        return { t: 'func', name: token.v, body: this.command() }
      }
    }

    return this.simple()
  }

  private simple(): Simple {
    const startToken = this.pos
    const node: Simple = { t: 'simple', assigns: [], words: [], redirs: [], line: '' }

    for (;;) {
      if (this.redirect(node.redirs)) continue

      const token = this.peek()

      if (token?.t !== 'word') break
      if (node.words.length === 0 && /^[A-Za-z_][A-Za-z0-9_]*\+?=/.test(token.v))
        node.assigns.push(token.v)
      else node.words.push(token.v)
      this.pos++
    }
    if (node.words.length === 0 && node.assigns.length === 0 && node.redirs.length === 0)
      throw this.unexpected()
    node.line = this.tokens
      .slice(startToken, this.pos)
      .map((token) => (token.t === 'nl' ? '' : token.t === 'op' ? token.v : token.v))
      .join(' ')

    return node
  }

  private ifClause(): If {
    this.pos++

    const clauses: If['clauses'] = []
    let otherwise: List | null = null
    const cond = this.list(new Set(['then']))

    this.expectWord('then')
    clauses.push({ cond, body: this.list(new Set(['elif', 'else', 'fi'])) })
    for (;;) {
      this.skipSeparators()
      if (this.peek() === undefined) throw new Incomplete()
      if (this.isWord('elif')) {
        this.pos++

        const more = this.list(new Set(['then']))

        this.expectWord('then')
        clauses.push({ cond: more, body: this.list(new Set(['elif', 'else', 'fi'])) })
      } else if (this.isWord('else')) {
        this.pos++
        otherwise = this.list(new Set(['fi']))
      } else if (this.isWord('fi')) {
        this.pos++

        return { t: 'if', clauses, otherwise }
      } else throw this.unexpected()
    }
  }

  private doBody(): List {
    this.expectWord('do')

    const body = this.list(new Set(['done']))

    this.expectWord('done')

    return body
  }

  private forClause(): For | CFor {
    this.pos++

    const token = this.peek()

    if (token === undefined) throw new Incomplete()
    if (token.t === 'arith') {
      this.pos++

      const [init = '', test = '', step = ''] = token.v.split(';')

      return { t: 'cfor', init, test, step, body: this.doBody() }
    }
    if (token.t !== 'word' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(token.v))
      throw new ShellError(`bash: \`${token.t === 'word' ? token.v : ''}': not a valid identifier`)
    this.pos++

    let items: Word[] | null = null

    while (this.peek()?.t === 'nl') this.pos++
    if (this.isWord('in')) {
      this.pos++
      items = []
      while (this.peek()?.t === 'word') {
        items.push((this.peek() as { v: string }).v)
        this.pos++
      }
    }

    return { t: 'for', name: token.v, items, body: this.doBody() }
  }

  private whileClause(until: boolean): While {
    this.pos++

    const cond = this.list(new Set(['do']))

    return { t: 'while', until, cond, body: this.doBody() }
  }

  private caseClause(): Case {
    this.pos++

    const word = this.peek()

    if (word?.t !== 'word') throw word === undefined ? new Incomplete() : this.unexpected()
    this.pos++
    this.expectWord('in')

    const arms: Case['arms'] = []

    for (;;) {
      this.skipNewlines()
      if (this.peek() === undefined) throw new Incomplete()
      if (this.isWord('esac')) {
        this.pos++

        return { t: 'case', word: word.v, arms }
      }
      if (this.isOp('(')) this.pos++

      const patterns: Word[] = []

      for (;;) {
        const pattern = this.peek()

        if (pattern?.t !== 'word')
          throw pattern === undefined ? new Incomplete() : this.unexpected()
        patterns.push(pattern.v)
        this.pos++
        if (this.isOp('|')) {
          this.pos++
          continue
        }
        if (this.isOp(')')) {
          this.pos++
          break
        }
        throw this.unexpected()
      }

      const body = this.list(new Set(['esac']))

      if (this.isOp(';;')) this.pos++
      arms.push({ patterns, body })
    }
  }

  private condClause(): Cond {
    this.pos++

    const words: Word[] = []

    for (;;) {
      const token = this.peek()

      if (token === undefined || token.t === 'nl') throw new Incomplete()
      this.pos++
      if (token.t === 'word' && token.v === ']]') return { t: 'cond', words }
      words.push(token.t === 'word' ? token.v : token.t === 'op' ? token.v : `((${token.v}))`)
    }
  }
}

/** El árbol de una orden. `Incomplete` si falta algo para terminarla. */
export function parse(src: string): List {
  const tokens = lex(src)

  return new Parser(tokens).parseAll()
}

/** Los programas que nombra una orden (también dentro de bucles y tuberías), para `requires`. */
export function commandsIn(src: string): string[] {
  const names: string[] = []
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit)

      return
    }
    if (node === null || typeof node !== 'object') return

    const record = node as Record<string, unknown>

    if (record.t === 'if' || record.t === 'for' || record.t === 'cfor' || record.t === 'case')
      names.push(record.t === 'cfor' ? 'for' : record.t)
    if (record.t === 'while') names.push(record.until === true ? 'until' : 'while')
    if (record.t === 'simple') {
      const words = record.words as string[]
      const first = words[0]?.replace(/['"\\]/g, '')

      if (first !== undefined) names.push(first)
      // Lo de dentro de `$(…)` también se ejecuta (`cp a "b-$(date +%F)"`).
      for (const word of [...words, ...(record.assigns as string[])]) {
        let at = word.indexOf('$(')

        while (at >= 0) {
          try {
            const end = skipParens(word, at + 1)

            names.push(...commandsIn(word.slice(at + 2, end - 1)))
            at = word.indexOf('$(', end)
          } catch {
            break
          }
        }
      }
      // `sudo grep`, `xargs grep`, `time grep`: también cuenta el de detrás.
      if (
        (first === 'sudo' || first === 'xargs' || first === 'time' || first === 'nohup') &&
        words[1] !== undefined &&
        !words[1].startsWith('-')
      )
        names.push(words[1].replace(/['"\\]/g, ''))
    }
    for (const value of Object.values(record)) if (typeof value === 'object') visit(value)
  }

  try {
    visit(parse(src))
  } catch {
    return []
  }

  return names
}
