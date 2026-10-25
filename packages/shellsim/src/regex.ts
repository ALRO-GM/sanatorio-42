/**
 * Expresiones regulares de `grep`, `sed`, `awk` y `[[ =~ ]]`, con un motor
 * propio: una máquina de Thompson con hilos (la «Pike VM»). No usa las
 * `RegExp` de JavaScript a propósito: un patrón como `(a+)+$` las hace volver
 * atrás sin fin y colgaría la pestaña o la API. Esta máquina recorre el texto
 * una sola vez con todos los caminos a la vez, así que tarda como mucho
 * «largo del texto × tamaño del patrón», y además gasta del presupuesto de la
 * orden (`Budget`).
 *
 * Entiende lo que se usa en el trabajo: BRE (lo de `grep` y `sed` sin `-E`,
 * con `\(` `\)` `\{` `\}` `\|` `\+` `\?`) y ERE (`-E`, awk): `.`, `[…]` con
 * rangos y clases POSIX (`[[:digit:]]`), `^`, `$`, `*`, `+`, `?`, `{m,n}`,
 * grupos, alternativas, `\w \s \d \b \< \>`. Las referencias hacia atrás
 * (`\1` en el patrón) no: no se pueden hacer en tiempo lineal.
 */

import type { Budget } from './limits.js'
import { ShellError } from './model.js'

type Item = { from: string; to: string }

type Node =
  | { t: 'char'; c: string }
  | { t: 'any' }
  | { t: 'class'; items: Item[]; neg: boolean }
  | { t: 'cat'; parts: Node[] }
  | { t: 'alt'; alts: Node[] }
  | { t: 'group'; n: number; node: Node }
  | { t: 'rep'; node: Node; min: number; max: number | null }
  | { t: 'assert'; kind: 'bol' | 'eol' | 'wordb' | 'nwordb' | 'wstart' | 'wend' }

type Instr =
  | { op: 'char'; c: string }
  | { op: 'any' }
  | { op: 'class'; items: Item[]; neg: boolean }
  | { op: 'split'; x: number; y: number }
  | { op: 'jmp'; x: number }
  | { op: 'save'; n: number }
  | { op: 'assert'; kind: 'bol' | 'eol' | 'wordb' | 'nwordb' | 'wstart' | 'wend' }
  | { op: 'match' }

/** Lo que se lee fuera del programa (no pasa): encaje. */
const MATCH: Instr = { op: 'match' }

/** Tamaño máximo del programa (un `{1,999}` anidado no puede inflarlo). */
const MAX_PROGRAM = 3000

const POSIX: Record<string, Item[]> = {
  alpha: [
    { from: 'a', to: 'z' },
    { from: 'A', to: 'Z' },
  ],
  digit: [{ from: '0', to: '9' }],
  alnum: [
    { from: 'a', to: 'z' },
    { from: 'A', to: 'Z' },
    { from: '0', to: '9' },
  ],
  upper: [{ from: 'A', to: 'Z' }],
  lower: [{ from: 'a', to: 'z' }],
  space: [
    { from: ' ', to: ' ' },
    { from: '\t', to: '\r' },
  ],
  blank: [
    { from: ' ', to: ' ' },
    { from: '\t', to: '\t' },
  ],
  punct: [
    { from: '!', to: '/' },
    { from: ':', to: '@' },
    { from: '[', to: '`' },
    { from: '{', to: '~' },
  ],
  xdigit: [
    { from: '0', to: '9' },
    { from: 'a', to: 'f' },
    { from: 'A', to: 'F' },
  ],
}

const WORD: Item[] = [...(POSIX.alnum ?? []), { from: '_', to: '_' }]
const SPACE: Item[] = POSIX.space ?? []
const DIGIT: Item[] = POSIX.digit ?? []

class Parser {
  private pos = 0
  groups = 0

  constructor(
    private readonly src: string,
    private readonly ere: boolean,
  ) {}

  parse(): Node {
    const node = this.alt()

    if (this.pos < this.src.length) throw this.error('Unmatched ) or \\)')

    return node
  }

  private error(what: string): ShellError {
    return new ShellError(`regex: ${what}`)
  }

  private peek(n = 0): string | undefined {
    return this.src[this.pos + n]
  }

  /** ¿Viene un operador? En BRE van con barra (`\|`), en ERE sin ella (`|`). */
  private isOp(op: string): boolean {
    if (this.ere) return this.peek() === op

    return this.peek() === '\\' && this.peek(1) === op
  }

  private eatOp(): void {
    this.pos += this.ere ? 1 : 2
  }

  private alt(): Node {
    const alts = [this.cat()]

    while (this.isOp('|')) {
      this.eatOp()
      alts.push(this.cat())
    }

    const [only] = alts

    return alts.length === 1 && only !== undefined ? only : { t: 'alt', alts }
  }

  private cat(): Node {
    const parts: Node[] = []

    while (this.pos < this.src.length && !this.isOp('|') && !this.isOp(')')) {
      let atom = this.atom(parts.length === 0)

      atom = this.quantifiers(atom)
      parts.push(atom)
    }

    const [only] = parts

    return parts.length === 1 && only !== undefined ? only : { t: 'cat', parts }
  }

  private quantifiers(atom: Node): Node {
    for (;;) {
      const c = this.peek()

      if (c === '*') {
        this.pos++
        atom = { t: 'rep', node: atom, min: 0, max: null }
      } else if (this.isOp('+')) {
        this.eatOp()
        atom = { t: 'rep', node: atom, min: 1, max: null }
      } else if (this.isOp('?')) {
        this.eatOp()
        atom = { t: 'rep', node: atom, min: 0, max: 1 }
      } else if (this.isOp('{')) {
        const save = this.pos

        this.eatOp()

        const bounds = this.bounds()

        if (bounds === null) {
          this.pos = save
          if (this.ere) return atom
          throw this.error('Invalid content of \\{\\}')
        }
        atom = { t: 'rep', node: atom, ...bounds }
      } else return atom
    }
  }

  private bounds(): { min: number; max: number | null } | null {
    const rest = this.src.slice(this.pos)
    const found = (this.ere ? /^(\d*)(,?)(\d*)\}/ : /^(\d*)(,?)(\d*)\\\}/).exec(rest)

    if (found === null || (found[1] === '' && found[3] === '')) return null
    this.pos += found[0].length

    const min = found[1] === '' ? 0 : Number(found[1])
    const max = found[2] === '' ? min : found[3] === '' ? null : Number(found[3])

    if (min > 255 || (max !== null && (max > 255 || max < min)))
      throw this.error('Invalid content of \\{\\}')

    return { min, max }
  }

  private atom(first: boolean): Node {
    const c = this.peek()

    if (c === undefined) throw this.error('unexpected end')
    if (this.isOp('(')) {
      this.eatOp()

      const n = ++this.groups
      const node = this.alt()

      if (!this.isOp(')')) throw this.error('Unmatched ( or \\(')
      this.eatOp()

      return { t: 'group', n, node }
    }
    if (c === '^' && (this.ere || first)) {
      this.pos++

      return { t: 'assert', kind: 'bol' }
    }
    if (c === '$' && (this.ere || this.atEnd())) {
      this.pos++

      return { t: 'assert', kind: 'eol' }
    }
    if (c === '*' && first) {
      this.pos++

      return { t: 'char', c: '*' }
    }
    if (this.ere && (c === '*' || c === '+' || c === '?'))
      throw this.error('Invalid preceding regular expression')
    if (c === '.') {
      this.pos++

      return { t: 'any' }
    }
    if (c === '[') return this.bracket()
    if (c === '\\') return this.escape()
    this.pos++

    return { t: 'char', c }
  }

  /** En BRE, `$` solo es fin de línea al final del patrón o de un grupo. */
  private atEnd(): boolean {
    const next = this.src.slice(this.pos + 1)

    return next === '' || next.startsWith('\\)') || next.startsWith('\\|')
  }

  private escape(): Node {
    this.pos++

    const c = this.peek()

    if (c === undefined) throw this.error('Trailing backslash')
    this.pos++
    switch (c) {
      case 'w':
        return { t: 'class', items: WORD, neg: false }
      case 'W':
        return { t: 'class', items: WORD, neg: true }
      case 's':
        return { t: 'class', items: SPACE, neg: false }
      case 'S':
        return { t: 'class', items: SPACE, neg: true }
      case 'd':
        return { t: 'class', items: DIGIT, neg: false }
      case 'D':
        return { t: 'class', items: DIGIT, neg: true }
      case 'b':
        return { t: 'assert', kind: 'wordb' }
      case 'B':
        return { t: 'assert', kind: 'nwordb' }
      case '<':
        return { t: 'assert', kind: 'wstart' }
      case '>':
        return { t: 'assert', kind: 'wend' }
      case 't':
        return { t: 'char', c: '\t' }
      case 'n':
        return { t: 'char', c: '\n' }
      default:
        if (/[1-9]/.test(c))
          throw new ShellError(
            'regex: las referencias hacia atrás (\\1…) no están en este simulador',
          )

        return { t: 'char', c }
    }
  }

  private bracket(): Node {
    this.pos++

    const items: Item[] = []
    let neg = false

    if (this.peek() === '^') {
      neg = true
      this.pos++
    }
    if (this.peek() === ']') {
      items.push({ from: ']', to: ']' })
      this.pos++
    }
    for (;;) {
      const c = this.peek()

      if (c === undefined) throw this.error('Unmatched [, [^, [:, [., or [=')
      if (c === ']') {
        this.pos++
        break
      }
      if (c === '[' && this.peek(1) === ':') {
        const end = this.src.indexOf(':]', this.pos + 2)
        const name = end < 0 ? '' : this.src.slice(this.pos + 2, end)
        const cls = Object.hasOwn(POSIX, name) ? POSIX[name] : undefined

        if (cls === undefined) throw this.error('Invalid character class name')
        items.push(...cls)
        this.pos = end + 2
        continue
      }
      this.pos++
      if (this.peek() === '-' && this.peek(1) !== undefined && this.peek(1) !== ']') {
        const to = this.peek(1) ?? c

        if (to < c) throw this.error('Invalid range end')
        items.push({ from: c, to })
        this.pos += 2
      } else items.push({ from: c, to: c })
    }

    return { t: 'class', items, neg }
  }
}

function compile(node: Node, out: Instr[]): void {
  if (out.length > MAX_PROGRAM)
    throw new ShellError('regex: el patrón es demasiado grande para este simulador')
  switch (node.t) {
    case 'char':
      out.push({ op: 'char', c: node.c })
      break
    case 'any':
      out.push({ op: 'any' })
      break
    case 'class':
      out.push({ op: 'class', items: node.items, neg: node.neg })
      break
    case 'assert':
      out.push({ op: 'assert', kind: node.kind })
      break
    case 'cat':
      for (const part of node.parts) compile(part, out)
      break
    case 'group':
      out.push({ op: 'save', n: node.n * 2 })
      compile(node.node, out)
      out.push({ op: 'save', n: node.n * 2 + 1 })
      break
    case 'alt': {
      const jumps: Instr[] = []

      node.alts.forEach((alt, index) => {
        if (index < node.alts.length - 1) {
          const split: Instr = { op: 'split', x: out.length + 1, y: 0 }

          out.push(split)
          compile(alt, out)

          const jump: Instr = { op: 'jmp', x: 0 }

          out.push(jump)
          jumps.push(jump)
          split.y = out.length
        } else compile(alt, out)
      })
      for (const jump of jumps) if (jump.op === 'jmp') jump.x = out.length
      break
    }
    case 'rep': {
      for (let i = 0; i < node.min; i++) compile(node.node, out)
      if (node.max === null) {
        const split: Instr = { op: 'split', x: out.length + 1, y: 0 }
        const at = out.length

        out.push(split)
        compile(node.node, out)
        out.push({ op: 'jmp', x: at })
        split.y = out.length
      } else {
        const splits: Instr[] = []

        for (let i = node.min; i < node.max; i++) {
          const split: Instr = { op: 'split', x: out.length + 1, y: 0 }

          out.push(split)
          splits.push(split)
          compile(node.node, out)
        }
        for (const split of splits) if (split.op === 'split') split.y = out.length
      }
      break
    }
  }
}

type Match = { start: number; end: number; groups: (string | undefined)[] }

const isWord = (c: string | undefined): boolean => c !== undefined && /\w/.test(c)

function inClass(items: Item[], c: string, icase: boolean): boolean {
  const test = (ch: string) => items.some((item) => ch >= item.from && ch <= item.to)

  return test(c) || (icase && (test(c.toLowerCase()) || test(c.toUpperCase())))
}

export class Regex {
  private readonly program: Instr[] = []
  private readonly groups: number

  constructor(
    source: string,
    private readonly opts: { ere?: boolean; icase?: boolean } = {},
  ) {
    const parser = new Parser(source, opts.ere === true)
    const tree = parser.parse()

    this.groups = parser.groups
    compile(tree, this.program)
    this.program.push({ op: 'match' })
  }

  private assert(kind: string, text: string, pos: number): boolean {
    const before = text[pos - 1]
    const after = text[pos]

    switch (kind) {
      case 'bol':
        return pos === 0
      case 'eol':
        return pos === text.length
      case 'wordb':
        return isWord(before) !== isWord(after)
      case 'nwordb':
        return isWord(before) === isWord(after)
      case 'wstart':
        return !isWord(before) && isWord(after)
      default:
        return isWord(before) && !isWord(after)
    }
  }

  /** El primer encaje desde `from` (el más a la izquierda; entre iguales, el más largo de los greedy). */
  exec(text: string, budget: Budget, from = 0): Match | null {
    const slots = (this.groups + 1) * 2
    type Thread = { pc: number; caps: number[] }
    let current: Thread[] = []
    let matched: number[] | null = null

    const add = (list: Thread[], seen: Set<number>, pc: number, caps: number[], pos: number) => {
      // Una pila en vez de recursión: un patrón largo no desborda la de JavaScript.
      const stack: { pc: number; caps: number[] }[] = [{ pc, caps }]

      while (stack.length > 0) {
        const top = stack.pop() as { pc: number; caps: number[] }

        if (seen.has(top.pc)) continue
        seen.add(top.pc)
        budget.tick()

        const instr = this.program[top.pc] ?? MATCH

        if (instr.op === 'jmp') stack.push({ pc: instr.x, caps: top.caps })
        else if (instr.op === 'split') {
          // Primero lo de más prioridad: se saca el último de la pila.
          stack.push({ pc: instr.y, caps: top.caps })
          stack.push({ pc: instr.x, caps: top.caps })
        } else if (instr.op === 'save') {
          const next = top.caps.slice()

          next[instr.n] = pos
          stack.push({ pc: top.pc + 1, caps: next })
        } else if (instr.op === 'assert') {
          if (this.assert(instr.kind, text, pos)) stack.push({ pc: top.pc + 1, caps: top.caps })
        } else list.push(top)
      }
    }

    const start = (pos: number): number[] => {
      const caps = new Array<number>(slots).fill(-1)

      caps[0] = pos

      return caps
    }

    let seen = new Set<number>()

    add(current, seen, 0, start(from), from)
    for (let pos = from; ; pos++) {
      const next: Thread[] = []
      const nextSeen = new Set<number>()
      const c = text[pos]

      for (const thread of current) {
        const instr = this.program[thread.pc] ?? MATCH

        budget.tick()
        if (instr.op === 'match') {
          matched = thread.caps.slice()
          matched[1] = pos
          // Los hilos de menos prioridad que este ya no importan.
          break
        }
        if (c === undefined) continue

        const icase = this.opts.icase === true
        const ok =
          instr.op === 'any'
            ? c !== '\n'
            : instr.op === 'char'
              ? icase
                ? instr.c.toLowerCase() === c.toLowerCase()
                : instr.c === c
              : instr.op === 'class'
                ? inClass(instr.items, c, icase) !== instr.neg
                : false

        if (ok) add(next, nextSeen, thread.pc + 1, thread.caps, pos + 1)
      }
      if (c === undefined) break
      // Sin encaje todavía, se prueba también a empezar en la posición siguiente.
      if (matched === null) add(next, nextSeen, 0, start(pos + 1), pos + 1)
      // Sin hilos y sin encaje, se sigue: en la posición siguiente puede empezar uno.
      if (next.length === 0 && matched !== null) break
      current = next
      seen = nextSeen
    }
    if (matched === null) return null

    const caps = matched
    const groups: (string | undefined)[] = []

    for (let g = 0; g <= this.groups; g++) {
      const a = caps[g * 2] ?? -1
      const b = caps[g * 2 + 1] ?? -1

      groups.push(a >= 0 && b >= 0 ? text.slice(a, b) : undefined)
    }

    return { start: caps[0] ?? 0, end: caps[1] ?? 0, groups }
  }

  test(text: string, budget: Budget): boolean {
    return this.exec(text, budget) !== null
  }

  /** Todos los encajes sin solaparse (los vacíos avanzan un carácter). */
  all(text: string, budget: Budget): Match[] {
    const found: Match[] = []
    let from = 0

    while (from <= text.length) {
      const match = this.exec(text, budget, from)

      if (match === null) break
      found.push(match)
      from = match.end > match.start ? match.end : match.end + 1
    }

    return found
  }
}

/** Una expresión regular, con el error de bash si no es válida. */
export function regex(source: string, opts: { ere?: boolean; icase?: boolean } = {}): Regex {
  return new Regex(source, opts)
}

/** Para `grep -F`: el texto tal cual, sin nada especial (se compila como ERE). */
export function literal(text: string): string {
  return text.replace(/[\\.[\]*^$+?(){}|]/g, (c) => `\\${c}`)
}
