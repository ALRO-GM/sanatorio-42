/**
 * Un `awk` pequeño, con lo que se usa de verdad para sacar columnas y hacer
 * cuentas sobre registros: `-F`, `-v`, `BEGIN`/`END`, patrones (`/regex/`,
 * `$3 > 100`, `NR > 1`), `print` y `printf` (también `> "fichero"`), campos
 * (`$1`, `$NF`), variables y vectores (`n[$1]++`, `for (k in n)`), `if`,
 * `while`, `for`, `next`, `exit`, y las funciones `length`, `substr`,
 * `index`, `split`, `sub`, `gsub`, `match`, `tolower`, `toupper`, `sprintf`,
 * `int`. Cada paso gasta del presupuesto de la orden: un `while (1)` se para.
 */

import { Fail, writeText } from '../fs.js'
import type { Budget } from '../limits.js'
import { LIMITS } from '../limits.js'
import { regex } from '../regex.js'
import type { Regex } from '../regex.js'
import type { CommandFn } from './types.js'
import { linesOf } from './types.js'
import { escapes, inputs, printf } from './util.js'

type Tok =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 're'; v: string }
  | { t: 'name'; v: string }
  | { t: 'func'; v: string }
  | { t: 'op'; v: string }
  | { t: 'nl' }

type Expr =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 're'; re: Regex }
  | { k: 'var'; name: string }
  | { k: 'field'; e: Expr }
  | { k: 'idx'; name: string; keys: Expr[] }
  | { k: 'bin'; op: string; a: Expr; b: Expr }
  | { k: 'un'; op: string; e: Expr }
  | { k: 'assign'; op: string; to: Expr; e: Expr }
  | { k: 'incdec'; op: string; pre: boolean; to: Expr }
  | { k: 'cond'; c: Expr; a: Expr; b: Expr }
  | { k: 'call'; name: string; args: Expr[] }
  | { k: 'in'; keys: Expr[]; name: string }
  | { k: 'group'; e: Expr }

type Stmt =
  | { k: 'expr'; e: Expr }
  | { k: 'print'; args: Expr[]; fmt: boolean; out: { append: boolean; to: Expr } | null }
  | { k: 'if'; c: Expr; a: Stmt; b: Stmt | null }
  | { k: 'while'; c: Expr; body: Stmt }
  | { k: 'do'; c: Expr; body: Stmt }
  | { k: 'for'; init: Stmt | null; c: Expr | null; step: Stmt | null; body: Stmt }
  | { k: 'forin'; v: string; arr: string; body: Stmt }
  | { k: 'block'; body: Stmt[] }
  | { k: 'next' }
  | { k: 'exit'; e: Expr | null }
  | { k: 'break' }
  | { k: 'continue' }
  | { k: 'delete'; name: string; keys: Expr[] | null }

type Rule = { pattern: Expr | 'BEGIN' | 'END' | null; action: Stmt[] | null }

const KEYWORDS = new Set([
  'BEGIN',
  'END',
  'print',
  'printf',
  'if',
  'else',
  'while',
  'for',
  'do',
  'in',
  'next',
  'exit',
  'break',
  'continue',
  'delete',
  'getline',
  'function',
  'return',
])
const BUILTINS = new Set([
  'length',
  'substr',
  'index',
  'split',
  'sub',
  'gsub',
  'match',
  'tolower',
  'toupper',
  'sprintf',
  'int',
  'sqrt',
  'system',
  'srand',
  'rand',
])

function lex(src: string): Tok[] {
  const toks: Tok[] = []
  let i = 0
  const operandEnd = () => {
    const last = toks.at(-1)

    return (
      last !== undefined &&
      (last.t === 'num' ||
        last.t === 'str' ||
        last.t === 'name' ||
        (last.t === 'op' &&
          (last.v === ')' ||
            last.v === ']' ||
            last.v === '$' ||
            last.v === '++' ||
            last.v === '--')))
    )
  }

  while (i < src.length) {
    const c = src[i] ?? ''

    if (c === ' ' || c === '\t' || (c === '\\' && src[i + 1] === '\n')) {
      i += c === '\\' ? 2 : 1
      continue
    }
    if (c === '\n') {
      toks.push({ t: 'nl' })
      i++
      continue
    }
    if (c === '#') {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }
    if (/\d/.test(c) || (c === '.' && /\d/.test(src[i + 1] ?? ''))) {
      const num = /^\d*\.?\d+(?:[eE][-+]?\d+)?|^\d+\.?/.exec(src.slice(i))?.[0] ?? c

      toks.push({ t: 'num', v: Number(num) })
      i += num.length
      continue
    }
    if (/[A-Za-z_]/.test(c)) {
      const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))?.[0] ?? c

      i += name.length
      toks.push(BUILTINS.has(name) ? { t: 'func', v: name } : { t: 'name', v: name })
      continue
    }
    if (c === '"') {
      let s = ''

      i++
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\' && i + 1 < src.length) {
          s += escapes(`\\${src[i + 1] ?? ''}`)
          if (!/[nt\\abfrv0e]/.test(src[i + 1] ?? ''))
            s = s.slice(0, -2) + (src[i + 1] === '"' ? '"' : (src[i + 1] ?? ''))
          i += 2
        } else s += src[i++] ?? ''
      }
      if (i >= src.length) throw new Fail('awk: unterminated string', 2)
      i++
      toks.push({ t: 'str', v: s })
      continue
    }
    if (c === '/' && !operandEnd()) {
      let re = ''

      i++
      while (i < src.length && src[i] !== '/') {
        if (src[i] === '\\' && src[i + 1] === '/') {
          re += '/'
          i += 2
        } else re += src[i++] ?? ''
      }
      if (i >= src.length) throw new Fail('awk: unterminated regexp', 2)
      i++
      toks.push({ t: 're', v: re })
      continue
    }

    const op =
      [
        '+=',
        '-=',
        '*=',
        '/=',
        '%=',
        '^=',
        '==',
        '!=',
        '<=',
        '>=',
        '&&',
        '||',
        '++',
        '--',
        '>>',
        '!~',
      ].find((each) => src.startsWith(each, i)) ?? c

    if (!'+-*/%^=<>!~?:,;(){}[]$|'.includes(op[0] ?? ''))
      throw new Fail(`awk: syntax error at source line 1: unexpected character '${c}'`, 2)
    toks.push({ t: 'op', v: op })
    i += op.length
  }

  return toks
}

class Parser {
  private pos = 0

  constructor(private readonly toks: Tok[]) {}

  private peek(n = 0): Tok | undefined {
    return this.toks[this.pos + n]
  }

  private isOp(v: string): boolean {
    const t = this.peek()

    return t?.t === 'op' && t.v === v
  }

  private isName(v: string): boolean {
    const t = this.peek()

    return t?.t === 'name' && t.v === v
  }

  private expect(v: string): void {
    if (!this.isOp(v)) throw this.error()
    this.pos++
  }

  private error(): Fail {
    const t = this.peek()

    return new Fail(
      `awk: syntax error at source line 1 near ${t === undefined ? 'end' : t.t === 'nl' ? 'newline' : 'v' in t ? String(t.v) : ''}`,
      2,
    )
  }

  private skip(): void {
    while (this.peek()?.t === 'nl' || this.isOp(';')) this.pos++
  }

  private nl(): void {
    while (this.peek()?.t === 'nl') this.pos++
  }

  program(): Rule[] {
    const rules: Rule[] = []

    this.skip()
    while (this.peek() !== undefined) {
      let pattern: Rule['pattern'] = null

      if (this.isName('BEGIN') || this.isName('END')) {
        pattern = (this.peek() as { v: 'BEGIN' | 'END' }).v
        this.pos++
      } else if (!this.isOp('{')) pattern = this.expr()

      const action = this.isOp('{') ? this.block() : null

      if (action === null && (pattern === 'BEGIN' || pattern === 'END')) throw this.error()
      rules.push({ pattern, action })
      this.skip()
    }

    return rules
  }

  private block(): Stmt[] {
    this.expect('{')

    const body: Stmt[] = []

    this.skip()
    while (!this.isOp('}')) {
      if (this.peek() === undefined) throw this.error()
      body.push(this.stmt())
      this.skip()
    }
    this.pos++

    return body
  }

  private simpleEnd(): void {
    if (this.isOp(';') || this.peek()?.t === 'nl') this.pos++
  }

  private stmt(): Stmt {
    if (this.isOp('{')) return { k: 'block', body: this.block() }

    const t = this.peek()

    if (t?.t === 'name') {
      switch (t.v) {
        case 'print':
        case 'printf': {
          this.pos++

          const args: Expr[] = []
          const paren = this.isOp('(') && this.closesPrintParen()

          if (paren) this.pos++
          if (!this.endOfSimple() && !(paren && this.isOp(')'))) {
            args.push(this.expr(true))
            while (this.isOp(',')) {
              this.pos++
              this.nl()
              args.push(this.expr(true))
            }
          }
          if (paren) this.expect(')')

          let out: { append: boolean; to: Expr } | null = null

          if (this.isOp('>') || this.isOp('>>')) {
            const append = this.isOp('>>')

            this.pos++
            out = { append, to: this.primary() }
          }
          this.simpleEnd()

          return { k: 'print', args, fmt: t.v === 'printf', out }
        }
        case 'if': {
          this.pos++
          this.expect('(')

          const c = this.expr()

          this.expect(')')
          this.nl()

          const a = this.stmt()

          this.skip()

          let b: Stmt | null = null

          if (this.isName('else')) {
            this.pos++
            this.nl()
            b = this.stmt()
          }

          return { k: 'if', c, a, b }
        }
        case 'while': {
          this.pos++
          this.expect('(')

          const c = this.expr()

          this.expect(')')
          this.nl()

          return { k: 'while', c, body: this.stmt() }
        }
        case 'do': {
          this.pos++
          this.nl()

          const body = this.stmt()

          this.skip()
          if (!this.isName('while')) throw this.error()
          this.pos++
          this.expect('(')

          const c = this.expr()

          this.expect(')')
          this.simpleEnd()

          return { k: 'do', c, body }
        }
        case 'for': {
          this.pos++
          this.expect('(')

          const a = this.peek()
          const b = this.peek(1)
          const c = this.peek(2)

          if (
            a?.t === 'name' &&
            b?.t === 'name' &&
            b.v === 'in' &&
            c?.t === 'name' &&
            this.peek(3)?.t === 'op'
          ) {
            this.pos += 3
            this.expect(')')
            this.nl()

            return { k: 'forin', v: a.v, arr: c.v, body: this.stmt() }
          }

          const init = this.isOp(';') ? null : ({ k: 'expr', e: this.expr() } as Stmt)

          this.expect(';')

          const cond = this.isOp(';') ? null : this.expr()

          this.expect(';')

          const step = this.isOp(')') ? null : ({ k: 'expr', e: this.expr() } as Stmt)

          this.expect(')')
          this.nl()

          return { k: 'for', init, c: cond, step, body: this.stmt() }
        }
        case 'next':
        case 'break':
        case 'continue':
          this.pos++
          this.simpleEnd()

          return { k: t.v }
        case 'exit': {
          this.pos++

          const e = this.endOfSimple() ? null : this.expr()

          this.simpleEnd()

          return { k: 'exit', e }
        }
        case 'delete': {
          this.pos++

          const name = this.peek()

          if (name?.t !== 'name') throw this.error()
          this.pos++

          let keys: Expr[] | null = null

          if (this.isOp('[')) keys = this.subscripts()
          this.simpleEnd()

          return { k: 'delete', name: name.v, keys }
        }
        case 'getline':
        case 'function':
        case 'return':
          throw new Fail(`awk: «${t.v}» no está en el awk de este simulador`, 2)
        default:
          break
      }
    }

    const e = this.expr()

    this.simpleEnd()

    return { k: 'expr', e }
  }

  /** `print (a, b)` frente a `print (a) b`: mira si el paréntesis cierra la lista. */
  private closesPrintParen(): boolean {
    let depth = 0

    for (let i = this.pos; i < this.toks.length; i++) {
      const t = this.toks[i]

      if (t?.t === 'op' && (t.v === '(' || t.v === '[')) depth++
      if (t?.t === 'op' && (t.v === ')' || t.v === ']')) {
        depth--
        if (depth === 0) {
          const next = this.toks[i + 1]

          return (
            next === undefined ||
            next.t === 'nl' ||
            (next.t === 'op' && [';', '}', '>', '>>'].includes(next.v))
          )
        }
      }
    }

    return false
  }

  private endOfSimple(): boolean {
    const t = this.peek()

    return (
      t === undefined ||
      t.t === 'nl' ||
      (t.t === 'op' && (t.v === ';' || t.v === '}' || t.v === '>' || t.v === '>>'))
    )
  }

  private subscripts(): Expr[] {
    this.expect('[')

    const keys = [this.expr()]

    while (this.isOp(',')) {
      this.pos++
      keys.push(this.expr())
    }
    this.expect(']')

    return keys
  }

  /** `noGt`: dentro de `print`, `>` es redirección, no comparación. */
  expr(noGt = false): Expr {
    return this.ternary(noGt)
  }

  private ternary(noGt: boolean): Expr {
    const c = this.or(noGt)

    if (this.isOp('?')) {
      this.pos++

      const a = this.ternary(noGt)

      this.expect(':')

      return { k: 'cond', c, a, b: this.ternary(noGt) }
    }
    if (
      this.peek()?.t === 'op' &&
      ['=', '+=', '-=', '*=', '/=', '%=', '^='].includes((this.peek() as { v: string }).v)
    ) {
      if (c.k !== 'var' && c.k !== 'field' && c.k !== 'idx') throw this.error()

      const op = (this.peek() as { v: string }).v

      this.pos++

      return { k: 'assign', op, to: c, e: this.ternary(noGt) }
    }

    return c
  }

  private or(noGt: boolean): Expr {
    let a = this.and(noGt)

    while (this.isOp('||')) {
      this.pos++
      this.nl()
      a = { k: 'bin', op: '||', a, b: this.and(noGt) }
    }

    return a
  }

  private and(noGt: boolean): Expr {
    let a = this.inExpr(noGt)

    while (this.isOp('&&')) {
      this.pos++
      this.nl()
      a = { k: 'bin', op: '&&', a, b: this.inExpr(noGt) }
    }

    return a
  }

  private inExpr(noGt: boolean): Expr {
    const a = this.match(noGt)

    if (this.isName('in')) {
      this.pos++

      const name = this.peek()

      if (name?.t !== 'name') throw this.error()
      this.pos++

      return { k: 'in', keys: a.k === 'group' ? [a.e] : [a], name: name.v }
    }

    return a
  }

  private match(noGt: boolean): Expr {
    let a = this.compare(noGt)

    while (this.isOp('~') || this.isOp('!~')) {
      const op = (this.peek() as { v: string }).v

      this.pos++
      a = { k: 'bin', op, a, b: this.compare(noGt) }
    }

    return a
  }

  private compare(noGt: boolean): Expr {
    const a = this.concat()
    const t = this.peek()

    if (t?.t === 'op' && ['<', '<=', '==', '!=', '>=', ...(noGt ? [] : ['>'])].includes(t.v)) {
      this.pos++

      return { k: 'bin', op: t.v, a, b: this.concat() }
    }

    return a
  }

  private startsOperand(): boolean {
    const t = this.peek()

    if (t === undefined) return false
    if (t.t === 'num' || t.t === 'str' || t.t === 'func' || t.t === 're') return true
    if (t.t === 'name') return !KEYWORDS.has(t.v)

    return (
      t.t === 'op' &&
      (t.v === '$' ||
        t.v === '(' ||
        t.v === '!' ||
        t.v === '-' ||
        t.v === '+' ||
        t.v === '++' ||
        t.v === '--')
    )
  }

  private concat(): Expr {
    let a = this.additive()

    // Dos expresiones seguidas se juntan como texto (`$1 " " $2`). Un `-` o un
    // `+` sueltos ya los ha comido la suma, así que aquí no son operandos.
    while (this.startsOperand() && !this.isOp('-') && !this.isOp('+') && !this.isOp('!'))
      a = { k: 'bin', op: 'concat', a, b: this.additive() }

    return a
  }

  private additive(): Expr {
    let a = this.multiplicative()

    while (this.isOp('+') || this.isOp('-')) {
      const op = (this.peek() as { v: string }).v

      this.pos++
      a = { k: 'bin', op, a, b: this.multiplicative() }
    }

    return a
  }

  private multiplicative(): Expr {
    let a = this.unary()

    while (this.isOp('*') || this.isOp('/') || this.isOp('%')) {
      const op = (this.peek() as { v: string }).v

      this.pos++
      a = { k: 'bin', op, a, b: this.unary() }
    }

    return a
  }

  private unary(): Expr {
    if (this.isOp('!') || this.isOp('-') || this.isOp('+')) {
      const op = (this.peek() as { v: string }).v

      this.pos++

      return { k: 'un', op, e: this.unary() }
    }

    return this.power()
  }

  private power(): Expr {
    const a = this.postfix()

    if (this.isOp('^')) {
      this.pos++

      return { k: 'bin', op: '^', a, b: this.unary() }
    }

    return a
  }

  private postfix(): Expr {
    if (this.isOp('++') || this.isOp('--')) {
      const op = (this.peek() as { v: string }).v

      this.pos++

      return { k: 'incdec', op, pre: true, to: this.primary() }
    }

    const e = this.primary()

    if (
      (this.isOp('++') || this.isOp('--')) &&
      (e.k === 'var' || e.k === 'field' || e.k === 'idx')
    ) {
      const op = (this.peek() as { v: string }).v

      this.pos++

      return { k: 'incdec', op, pre: false, to: e }
    }

    return e
  }

  private primary(): Expr {
    const t = this.peek()

    if (t === undefined) throw this.error()
    this.pos++
    switch (t.t) {
      case 'num':
        return { k: 'num', v: t.v }
      case 'str':
        return { k: 'str', v: t.v }
      case 're':
        return { k: 're', re: compile(t.v) }
      case 'func': {
        const args: Expr[] = []

        if (this.isOp('(')) {
          this.pos++
          if (!this.isOp(')')) {
            args.push(this.expr())
            while (this.isOp(',')) {
              this.pos++
              args.push(this.expr())
            }
          }
          this.expect(')')
        }

        return { k: 'call', name: t.v, args }
      }
      case 'name':
        if (KEYWORDS.has(t.v)) {
          this.pos--
          throw this.error()
        }
        if (this.isOp('[')) return { k: 'idx', name: t.v, keys: this.subscripts() }

        return { k: 'var', name: t.v }
      case 'op':
        if (t.v === '$') return { k: 'field', e: this.postfixField() }
        if (t.v === '(') {
          const e = this.expr()

          if (this.isOp(',')) {
            const keys = [e]

            while (this.isOp(',')) {
              this.pos++
              keys.push(this.expr())
            }
            this.expect(')')
            if (!this.isName('in')) throw this.error()
            this.pos++

            const name = this.peek()

            if (name?.t !== 'name') throw this.error()
            this.pos++

            return { k: 'in', keys, name: name.v }
          }
          this.expect(')')

          return { k: 'group', e }
        }
        this.pos--
        throw this.error()
      default:
        this.pos--
        throw this.error()
    }
  }

  /** Lo que va detrás de `$`: un número, una variable, `NF`, `(expresión)`. */
  private postfixField(): Expr {
    if (this.isOp('(')) return this.primary()
    if (this.isOp('-') || this.isOp('+')) return this.unary()

    return this.primary()
  }
}

function compile(source: string): Regex {
  try {
    return regex(source, { ere: true })
  } catch (error) {
    throw new Fail(`awk: ${error instanceof Error ? error.message : 'bad regex'}`, 2)
  }
}

type Value = string | number

const looksNumeric = (v: Value): boolean =>
  typeof v === 'number' || /^\s*[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?\s*$/.test(v)

const num = (v: Value): number => (typeof v === 'number' ? v : Number.parseFloat(v) || 0)

const str = (v: Value): string => {
  if (typeof v === 'string') return v
  if (Number.isInteger(v)) return String(v)

  return String(Number(v.toPrecision(6)))
}

class Next extends Error {}
class ExitAwk extends Error {
  constructor(readonly code: number) {
    super('exit')
  }
}
class LoopBreak extends Error {
  constructor(readonly cont: boolean) {
    super('break')
  }
}

class Runtime {
  vars = new Map<string, Value>()
  arrays = new Map<string, Map<string, Value>>()
  fields: string[] = ['']
  outputs = new Map<string, { append: boolean; text: string }>()

  constructor(
    private readonly budget: Budget,
    private readonly out: (text: string) => void,
  ) {
    this.vars.set('FS', ' ')
    this.vars.set('OFS', ' ')
    this.vars.set('ORS', '\n')
    this.vars.set('NR', 0)
    this.vars.set('NF', 0)
    this.vars.set('SUBSEP', '\u001c')
  }

  setRecord(line: string): void {
    const fs = str(this.vars.get('FS') ?? ' ')
    const fields =
      line === ''
        ? []
        : fs === ' '
          ? line
              .trim()
              .split(/[ \t]+/)
              .filter(Boolean)
          : fs.length === 1
            ? line.split(fs)
            : this.splitBy(line, fs)

    this.fields = [line, ...fields]
    this.vars.set('NF', fields.length)
  }

  /** Un separador de varios caracteres (`-F', '`, `-F'[:,]'`) es una regex, con el motor lineal. */
  private splitBy(line: string, fs: string): string[] {
    const parts: string[] = []
    let from = 0

    for (const match of compile(fs).all(line, this.budget)) {
      if (match.end === match.start) continue
      parts.push(line.slice(from, match.start))
      from = match.end
    }
    parts.push(line.slice(from))

    return parts
  }

  private rebuild(): void {
    this.fields[0] = this.fields.slice(1).join(str(this.vars.get('OFS') ?? ' '))
  }

  private array(name: string): Map<string, Value> {
    let arr = this.arrays.get(name)

    if (arr === undefined) {
      arr = new Map()
      this.arrays.set(name, arr)
    }

    return arr
  }

  private key(keys: Expr[]): string {
    return keys.map((k) => str(this.evaluate(k))).join(str(this.vars.get('SUBSEP') ?? '\u001c'))
  }

  private get(e: Expr): Value {
    if (e.k === 'var') return this.vars.get(e.name) ?? ''
    if (e.k === 'field') return this.fields[num(this.evaluate(e.e))] ?? ''
    if (e.k === 'idx') return this.array(e.name).get(this.key(e.keys)) ?? ''

    return this.evaluate(e)
  }

  private set(e: Expr, value: Value): Value {
    if (e.k === 'var') {
      this.vars.set(e.name, value)
      if (e.name === 'NF') {
        this.fields = this.fields.slice(0, num(value) + 1)
        this.rebuild()
      }
    } else if (e.k === 'field') {
      const i = num(this.evaluate(e.e))

      if (i > 1000) throw new Fail('awk: campo demasiado grande', 2)
      if (i === 0) this.setRecord(str(value))
      else {
        while (this.fields.length <= i) this.fields.push('')
        this.fields[i] = str(value)
        this.vars.set('NF', this.fields.length - 1)
        this.rebuild()
      }
    } else if (e.k === 'idx') {
      const arr = this.array(e.name)

      if (arr.size > 2000) throw new Fail('awk: peer4u-sandbox: vector demasiado grande', 2)
      arr.set(this.key(e.keys), value)
    }

    return value
  }

  evaluate(e: Expr): Value {
    this.budget.tick()
    switch (e.k) {
      case 'num':
        return e.v
      case 'str':
        return e.v
      case 're':
        return e.re.test(this.fields[0] ?? '', this.budget) ? 1 : 0
      case 'group':
        return this.evaluate(e.e)
      case 'var':
      case 'field':
      case 'idx':
        return this.get(e)
      case 'in':
        return this.array(e.name).has(this.key(e.keys)) ? 1 : 0
      case 'cond':
        return this.truthy(this.evaluate(e.c)) ? this.evaluate(e.a) : this.evaluate(e.b)
      case 'un': {
        const v = this.evaluate(e.e)

        return e.op === '!' ? (this.truthy(v) ? 0 : 1) : e.op === '-' ? -num(v) : num(v)
      }
      case 'incdec': {
        const old = num(this.get(e.to))
        const next = old + (e.op === '++' ? 1 : -1)

        this.set(e.to, next)

        return e.pre ? next : old
      }
      case 'assign': {
        const v = this.evaluate(e.e)

        if (e.op === '=') return this.set(e.to, v)

        const old = num(this.get(e.to))
        const n = num(v)
        const result =
          e.op === '+='
            ? old + n
            : e.op === '-='
              ? old - n
              : e.op === '*='
                ? old * n
                : e.op === '/='
                  ? old / this.nonzero(n)
                  : e.op === '%='
                    ? old % this.nonzero(n)
                    : old ** n

        return this.set(e.to, result)
      }
      case 'bin':
        return this.binary(e.op, e.a, e.b)
      case 'call':
        return this.call(e.name, e.args)
    }
  }

  private nonzero(n: number): number {
    if (n === 0) throw new Fail('awk: division by zero', 2)

    return n
  }

  truthy(v: Value): boolean {
    return typeof v === 'number'
      ? v !== 0
      : looksNumeric(v) && v.trim() !== ''
        ? num(v) !== 0
        : v !== ''
  }

  private regexOf(e: Expr): Regex {
    return e.k === 're' ? e.re : compile(str(this.evaluate(e)))
  }

  private binary(op: string, a: Expr, b: Expr): Value {
    if (op === '&&') return this.truthy(this.evaluate(a)) && this.truthy(this.evaluate(b)) ? 1 : 0
    if (op === '||') return this.truthy(this.evaluate(a)) || this.truthy(this.evaluate(b)) ? 1 : 0
    if (op === '~' || op === '!~')
      return this.regexOf(b).test(str(this.evaluate(a)), this.budget) === (op === '~') ? 1 : 0

    const x = this.evaluate(a)
    const y = this.evaluate(b)

    switch (op) {
      case 'concat': {
        const text = str(x) + str(y)

        if (text.length > LIMITS.varChars)
          throw new Fail('awk: peer4u-sandbox: texto demasiado largo', 2)

        return text
      }
      case '+':
        return num(x) + num(y)
      case '-':
        return num(x) - num(y)
      case '*':
        return num(x) * num(y)
      case '/':
        return num(x) / this.nonzero(num(y))
      case '%':
        return num(x) % this.nonzero(num(y))
      case '^':
        return num(x) ** num(y)
      default: {
        const numeric = looksNumeric(x) && looksNumeric(y)
        const l: Value = numeric ? num(x) : str(x)
        const r: Value = numeric ? num(y) : str(y)
        const result =
          op === '<'
            ? l < r
            : op === '<='
              ? l <= r
              : op === '>'
                ? l > r
                : op === '>='
                  ? l >= r
                  : op === '=='
                    ? l === r
                    : l !== r

        return result ? 1 : 0
      }
    }
  }

  private call(name: string, args: Expr[]): Value {
    const arg = (i: number): Value => {
      const e = args[i]

      return e === undefined ? '' : this.evaluate(e)
    }

    switch (name) {
      case 'length':
        return args.length === 0
          ? (this.fields[0] ?? '').length
          : args[0]?.k === 'var' && this.arrays.has(args[0].name)
            ? this.array(args[0].name).size
            : str(arg(0)).length
      case 'substr': {
        const s = str(arg(0))
        const start = Math.round(num(arg(1)))
        const length = args.length > 2 ? Math.round(num(arg(2))) : Infinity
        const from = Math.max(start, 1)
        const to = start + length

        return s.slice(from - 1, Number.isFinite(to) ? Math.max(from - 1, to - 1) : undefined)
      }
      case 'index':
        return str(arg(0)).indexOf(str(arg(1))) + 1
      case 'split': {
        const target = args[1]

        if (target?.k !== 'var') throw new Fail('awk: split: el segundo argumento es un vector', 2)

        const s = str(arg(0))
        const sep = args.length > 2 ? str(arg(2)) : str(this.vars.get('FS') ?? ' ')
        const parts =
          sep === ' '
            ? s
                .trim()
                .split(/[ \t]+/)
                .filter(Boolean)
            : s.split(sep)
        const arr = new Map<string, Value>()

        parts.forEach((part, index) => arr.set(String(index + 1), part))
        this.arrays.set(target.name, arr)

        return parts.length
      }
      case 'sub':
      case 'gsub': {
        const re = this.regexOf(args[0] ?? { k: 'str', v: '' })
        const replacement = str(arg(1))
        const target = args[2] ?? { k: 'field', e: { k: 'num', v: 0 } }
        const text = str(this.get(target))
        let out = ''
        let from = 0
        let count = 0

        while (from <= text.length) {
          const match = re.exec(text, this.budget, from)

          if (match === null) break
          out +=
            text.slice(from, match.start) +
            replacement.replace(/\\&|&/g, (all) =>
              all === '&' ? text.slice(match.start, match.end) : '&',
            )
          count++
          if (match.end === match.start) {
            out += text.slice(match.end, match.end + 1)
            from = match.end + 1
          } else from = match.end
          if (name === 'sub') break
        }
        if (count > 0) this.set(target, out + text.slice(from))

        return count
      }
      case 'match': {
        const found = this.regexOf(args[1] ?? { k: 'str', v: '' }).exec(str(arg(0)), this.budget)

        this.vars.set('RSTART', found === null ? 0 : found.start + 1)
        this.vars.set('RLENGTH', found === null ? -1 : found.end - found.start)

        return found === null ? 0 : found.start + 1
      }
      case 'tolower':
        return str(arg(0)).toLowerCase()
      case 'toupper':
        return str(arg(0)).toUpperCase()
      case 'sprintf':
        return printf(
          str(arg(0)),
          args.slice(1).map((_e, i) => str(arg(i + 1))),
        )
      case 'int':
        return Math.trunc(num(arg(0)))
      case 'sqrt':
        return Math.sqrt(num(arg(0)))
      case 'rand':
        return 0.237
      case 'srand':
        return 0
      default:
        throw new Fail(`awk: ${name}: en el simulador awk no ejecuta órdenes`, 2)
    }
  }

  exec(s: Stmt): void {
    this.budget.tick()
    switch (s.k) {
      case 'expr':
        this.evaluate(s.e)
        break
      case 'block':
        for (const each of s.body) this.exec(each)
        break
      case 'print': {
        const values = s.args.map((e) => this.evaluate(e))
        let text: string

        if (s.fmt) text = printf(str(values[0] ?? ''), values.slice(1).map(str))
        else
          text =
            (values.length === 0
              ? (this.fields[0] ?? '')
              : values
                  .map((v) => (typeof v === 'number' ? str(v) : v))
                  .join(str(this.vars.get('OFS') ?? ' '))) + str(this.vars.get('ORS') ?? '\n')
        if (s.out === null) this.out(text)
        else {
          const file = str(this.evaluate(s.out.to))
          const entry = this.outputs.get(file) ?? { append: s.out.append, text: '' }

          entry.text += text
          if (entry.text.length > LIMITS.fileChars)
            throw new Fail('awk: peer4u-sandbox: fichero demasiado grande', 2)
          this.outputs.set(file, entry)
        }
        break
      }
      case 'if':
        if (this.truthy(this.evaluate(s.c))) this.exec(s.a)
        else if (s.b !== null) this.exec(s.b)
        break
      case 'while':
      case 'do': {
        let turns = 0

        if (s.k === 'do') {
          try {
            this.exec(s.body)
          } catch (signal) {
            if (!(signal instanceof LoopBreak)) throw signal
            if (!signal.cont) break
          }
        }
        while (this.truthy(this.evaluate(s.c))) {
          if (++turns > LIMITS.loop * 10)
            throw new Fail('awk: peer4u-sandbox: bucle demasiado largo', 2)
          try {
            this.exec(s.body)
          } catch (signal) {
            if (!(signal instanceof LoopBreak)) throw signal
            if (!signal.cont) break
          }
        }
        break
      }
      case 'for': {
        let turns = 0

        if (s.init !== null) this.exec(s.init)
        while (s.c === null || this.truthy(this.evaluate(s.c))) {
          if (++turns > LIMITS.loop * 10)
            throw new Fail('awk: peer4u-sandbox: bucle demasiado largo', 2)
          try {
            this.exec(s.body)
          } catch (signal) {
            if (!(signal instanceof LoopBreak)) throw signal
            if (!signal.cont) break
          }
          if (s.step !== null) this.exec(s.step)
        }
        break
      }
      case 'forin':
        // Como en gawk, el orden de un `for (k in v)` no está garantizado; aquí
        // es el de inserción, que es determinista (y por eso se suele pasar a `sort`).
        for (const key of [...this.array(s.arr).keys()]) {
          this.vars.set(s.v, key)
          try {
            this.exec(s.body)
          } catch (signal) {
            if (!(signal instanceof LoopBreak)) throw signal
            if (!signal.cont) break
          }
        }
        break
      case 'next':
        throw new Next()
      case 'exit':
        throw new ExitAwk(s.e === null ? 0 : num(this.evaluate(s.e)))
      case 'break':
        throw new LoopBreak(false)
      case 'continue':
        throw new LoopBreak(true)
      case 'delete':
        if (s.keys === null) this.arrays.delete(s.name)
        else this.array(s.name).delete(this.key(s.keys))
        break
    }
  }
}

const awk: CommandFn = (ctx) => {
  const args = [...ctx.args]
  let fs: string | null = null
  const assigns: [string, string][] = []

  while (args.length > 0) {
    const arg = args[0] ?? ''

    if (arg === '-F') {
      args.shift()
      fs = args.shift() ?? ' '
    } else if (arg.startsWith('-F')) {
      fs = arg.slice(2)
      args.shift()
    } else if (arg === '-v') {
      args.shift()

      const [name = '', value = ''] = (args.shift() ?? '').split(/=(.*)/s)

      assigns.push([name, value])
    } else if (arg === '-f')
      throw new Fail('awk: -f: en el simulador el programa va entre comillas', 2)
    else if (arg === '--') {
      args.shift()
      break
    } else break
  }
  const program = args.shift()
  if (program === undefined)
    throw new Fail('usage: awk [-F fs][-v var=value][prog | -f progfile][file ...]', 2)

  const rules = new Parser(lex(program)).program()
  const runtime = new Runtime(ctx.sh.budget, ctx.io.out)

  if (fs !== null) runtime.vars.set('FS', fs === 't' ? '\t' : escapes(fs))
  for (const [name, value] of assigns) runtime.vars.set(name, value)

  const run = (kind: 'BEGIN' | 'END') => {
    for (const rule of rules)
      if (rule.pattern === kind) for (const s of rule.action ?? []) runtime.exec(s)
  }
  let code = 0

  try {
    run('BEGIN')

    const main = rules.filter((rule) => rule.pattern !== 'BEGIN' && rule.pattern !== 'END')

    if (main.length > 0 || rules.some((rule) => rule.pattern === 'END')) {
      const files = args.filter((arg) => !/^[A-Za-z_]\w*=/.test(arg))
      let nr = 0

      for (const input of inputs(ctx, files)) {
        runtime.vars.set('FILENAME', input.name)

        let fnr = 0

        for (const line of linesOf(input.text)) {
          runtime.vars.set('NR', ++nr)
          runtime.vars.set('FNR', ++fnr)
          runtime.setRecord(line)
          try {
            for (const rule of main) {
              const pattern = rule.pattern as Expr | null

              if (pattern !== null && !runtime.truthy(runtime.evaluate(pattern))) continue
              if (rule.action === null) ctx.io.out(`${runtime.fields[0] ?? ''}\n`)
              else for (const s of rule.action) runtime.exec(s)
            }
          } catch (signal) {
            if (!(signal instanceof Next)) throw signal
          }
        }
      }
    }
    run('END')
  } catch (signal) {
    if (signal instanceof ExitAwk) code = signal.code
    else if (signal instanceof LoopBreak)
      throw new Fail('awk: break o continue fuera de un bucle', 2)
    else throw signal
  }
  for (const [file, { append, text }] of runtime.outputs)
    writeText(ctx.sh.machine(), ctx.sh.user(), ctx.sh.abs(file), text, {
      append,
      cmd: 'awk',
      shown: file,
      now: ctx.sh.now(),
      umask: ctx.sh.session().umask,
    })

  return code
}

export const AWK_COMMANDS = { awk }
