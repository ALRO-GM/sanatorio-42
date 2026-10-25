/**
 * `sed`, lo que se usa para cambiar configuraciones y limpiar texto:
 * `s/viejo/nuevo/g` (con `&`, `\1`, `i`, `p` y cualquier separador),
 * direcciones (`3`, `$`, `/patrón/`, `1,5`, `/a/,/b/`, `!`), `d`, `p`, `q`,
 * `=`, `a`, `i`, `c`, `y`, y las opciones `-n`, `-i` (también `-i.bak`),
 * `-E` y `-e`. Las expresiones regulares son las del motor lineal.
 */

import { Fail, lookup, writeText } from '../fs.js'
import { regex } from '../regex.js'
import type { Regex } from '../regex.js'
import type { CommandFn } from './types.js'
import { joinLines, linesOf } from './types.js'
import { inputs } from './util.js'

type Addr = { kind: 'line'; n: number } | { kind: 'last' } | { kind: 're'; re: Regex }

type SedCmd = {
  from: Addr | null
  to: Addr | null
  neg: boolean
  op: string
  re?: Regex
  replacement?: string
  global?: boolean
  print?: boolean
  nth?: number
  text?: string
  map?: [string, string]
  /** Para los rangos: si estamos dentro. */
  inside?: boolean
}

class SedParser {
  private pos = 0

  constructor(
    private readonly src: string,
    private readonly ere: boolean,
  ) {}

  private error(what: string): Fail {
    return new Fail(`sed: -e expression #1, char ${this.pos + 1}: ${what}`)
  }

  /** Hasta el separador sin escapar; `\separador` queda como el carácter. */
  private until(delim: string): string {
    let out = ''

    while (this.pos < this.src.length) {
      const c = this.src[this.pos] ?? ''

      if (c === '\\' && this.src[this.pos + 1] === delim) {
        out += delim
        this.pos += 2
        continue
      }
      if (c === '\\') {
        out += c + (this.src[this.pos + 1] ?? '')
        this.pos += 2
        continue
      }
      if (c === delim) {
        this.pos++

        return out
      }
      out += c
      this.pos++
    }
    throw this.error(`unterminated \`s' command`)
  }

  private compile(source: string, icase = false): Regex {
    try {
      return regex(source, { ere: this.ere, icase })
    } catch (error) {
      throw this.error(error instanceof Error ? error.message.replace(/^regex: /, '') : 'bad regex')
    }
  }

  private addr(): Addr | null {
    const c = this.src[this.pos]

    if (c === '$') {
      this.pos++

      return { kind: 'last' }
    }
    if (c !== undefined && /\d/.test(c)) {
      const n = /^\d+/.exec(this.src.slice(this.pos))?.[0] ?? '0'

      this.pos += n.length

      return { kind: 'line', n: Number(n) }
    }
    if (c === '/') {
      this.pos++

      return { kind: 're', re: this.compile(this.until('/')) }
    }

    return null
  }

  parse(): SedCmd[] {
    const cmds: SedCmd[] = []

    while (this.pos < this.src.length) {
      while (/[\s;]/.test(this.src[this.pos] ?? '')) this.pos++
      if (this.pos >= this.src.length) break

      const from = this.addr()
      let to: Addr | null = null

      if (from !== null && this.src[this.pos] === ',') {
        this.pos++
        to = this.addr()
        if (to === null) throw this.error("unexpected `,'")
      }
      while (this.src[this.pos] === ' ') this.pos++

      let neg = false

      if (this.src[this.pos] === '!') {
        neg = true
        this.pos++
      }

      const op = this.src[this.pos++]

      if (op === undefined) throw this.error('missing command')

      const cmd: SedCmd = { from, to, neg, op }

      if (op === 's') {
        const delim = this.src[this.pos++]

        if (delim === undefined || delim === '\n' || delim === '\\')
          throw this.error(`unterminated \`s' command`)

        const pattern = this.until(delim)
        const replacement = this.until(delim)
        const flags = /^[gpiI0-9]*/.exec(this.src.slice(this.pos))?.[0] ?? ''

        this.pos += flags.length
        cmd.re = this.compile(pattern, /[iI]/.test(flags))
        cmd.replacement = replacement
        cmd.global = flags.includes('g')
        cmd.print = flags.includes('p')

        const nth = /\d+/.exec(flags)?.[0]

        if (nth !== undefined) cmd.nth = Number(nth)
      } else if (op === 'y') {
        const delim = this.src[this.pos++] ?? '/'
        const a = this.until(delim)
        const b = this.until(delim)

        if (a.length !== b.length) throw this.error("strings for `y' command are different lengths")
        cmd.map = [a, b]
      } else if (op === 'a' || op === 'i' || op === 'c') {
        let text = this.src
          .slice(this.pos)
          .replace(/^\\?\n?/, '')
          .replace(/^\s+/, '')
        const end = text.indexOf('\n')

        if (end >= 0) text = text.slice(0, end)
        this.pos += this.src.slice(this.pos).indexOf(text) + text.length
        cmd.text = text
      } else if (!['d', 'p', 'q', '=', 'n', 'N'].includes(op))
        throw this.error(`unknown command: \`${op}'`)
      cmds.push(cmd)
    }

    return cmds
  }
}

function replace(
  cmd: SedCmd,
  line: string,
  budget: Parameters<Regex['exec']>[1],
): { text: string; done: boolean } {
  const re = cmd.re

  if (re === undefined) return { text: line, done: false }
  let out = ''
  let from = 0
  let count = 0
  let done = false

  while (from <= line.length) {
    const match = re.exec(line, budget, from)

    if (match === null) break
    count++

    const wanted = cmd.nth === undefined ? true : count === cmd.nth

    if (wanted) {
      out += line.slice(from, match.start)
      out += (cmd.replacement ?? '').replace(
        /\\(\d)|\\n|\\t|\\&|\\\\|&/g,
        (all, group?: string) => {
          if (all === '&') return line.slice(match.start, match.end)
          if (all === '\\&') return '&'
          if (all === '\\n') return '\n'
          if (all === '\\t') return '\t'
          if (all === '\\\\') return '\\'

          return match.groups[Number(group)] ?? ''
        },
      )
      done = true
    } else out += line.slice(from, match.end)
    if (match.end === match.start) {
      out += line.slice(match.end, match.end + 1)
      from = match.end + 1
    } else from = match.end
    if (wanted && !cmd.global) break
  }
  if (!done) return { text: line, done: false }

  return { text: out + line.slice(from), done: true }
}

const sed: CommandFn = (ctx) => {
  const scripts: string[] = []
  const files: string[] = []
  let quiet = false
  let inPlace: string | null = null
  let ere = false

  for (let i = 0; i < ctx.args.length; i++) {
    const arg = ctx.args[i] ?? ''

    if (arg === '-e' || arg === '--expression') scripts.push(ctx.args[++i] ?? '')
    else if (arg === '-n' || arg === '--quiet' || arg === '--silent') quiet = true
    else if (arg === '-E' || arg === '-r' || arg === '--regexp-extended') ere = true
    else if (arg.startsWith('-i') || arg.startsWith('--in-place'))
      inPlace = arg.replace(/^(-i|--in-place=?)/, '')
    else if (/^-[nEr]+$/.test(arg)) {
      quiet ||= arg.includes('n')
      ere ||= /[Er]/.test(arg)
    } else if (arg.startsWith('-') && arg.length > 1)
      throw new Fail(`sed: invalid option -- '${arg.slice(1)}'`)
    else if (scripts.length === 0) scripts.push(arg)
    else files.push(arg)
  }
  if (scripts.length === 0)
    throw new Fail('Usage: sed [OPTION]... {script-only-if-no-other-script} [input-file]...', 1)

  const cmds = new SedParser(scripts.join('\n'), ere).parse()
  const budget = ctx.sh.budget

  const process = (text: string): string => {
    const lines = linesOf(text)
    const out: string[] = []
    let quit = false

    for (const cmd of cmds) cmd.inside = false

    const hit = (addr: Addr, n: number, line: string): boolean =>
      addr.kind === 'line'
        ? addr.n === n
        : addr.kind === 'last'
          ? n === lines.length
          : addr.re.test(line, budget)

    for (let index = 0; index < lines.length && !quit; index++) {
      let line = lines[index] ?? ''
      const n = index + 1
      let deleted = false
      const before: string[] = []
      const after: string[] = []

      for (const cmd of cmds) {
        budget.tick()

        let selected: boolean

        if (cmd.from === null) selected = true
        else if (cmd.to === null) selected = hit(cmd.from, n, line)
        else if (cmd.inside === true) {
          selected = true
          if (cmd.to.kind === 'line' ? n >= cmd.to.n : hit(cmd.to, n, line)) cmd.inside = false
        } else if (hit(cmd.from, n, line)) {
          selected = true
          cmd.inside = !(cmd.to.kind === 'line' && cmd.to.n <= n)
        } else selected = false
        if (selected === cmd.neg) continue
        if (cmd.op === 's') {
          const result = replace(cmd, line, budget)

          line = result.text
          if (result.done && cmd.print === true) out.push(line)
        } else if (cmd.op === 'd') {
          deleted = true
          break
        } else if (cmd.op === 'p') out.push(line)
        else if (cmd.op === '=') out.push(String(n))
        else if (cmd.op === 'q') quit = true
        else if (cmd.op === 'y' && cmd.map !== undefined) {
          const [a, b] = cmd.map

          line = Array.from(line)
            .map((c) => (a.includes(c) ? (b[a.indexOf(c)] ?? c) : c))
            .join('')
        } else if (cmd.op === 'a') after.push(cmd.text ?? '')
        else if (cmd.op === 'i') before.push(cmd.text ?? '')
        else if (cmd.op === 'c') {
          before.push(cmd.text ?? '')
          deleted = true
          break
        }
      }
      out.push(...before)
      if (!deleted && !quiet) out.push(line)
      out.push(...after)
    }

    return joinLines(out)
  }

  if (inPlace !== null) {
    if (files.length === 0) throw new Fail('sed: no input files')

    const machine = ctx.sh.machine()
    const user = ctx.sh.user()

    for (const file of files) {
      const [input] = inputs(ctx, [file])
      const path = ctx.sh.abs(file)

      if (input === undefined) continue
      if (lookup(machine, user, path) === null)
        throw new Fail(`sed: can't read ${file}: No such file or directory`, 2)

      const opts = { now: ctx.sh.now(), umask: ctx.sh.session().umask }

      if (inPlace !== '')
        writeText(machine, user, path + inPlace, input.text, {
          cmd: 'sed',
          shown: file + inPlace,
          ...opts,
        })
      writeText(machine, user, path, process(input.text), { cmd: 'sed', shown: file, ...opts })
    }

    return 0
  }

  let code = 0

  for (const input of files.length === 0 ? [null] : files) {
    try {
      const [read] = inputs(ctx, input === null ? [] : [input])

      ctx.io.out(process(read?.text ?? ''))
    } catch (error) {
      if (!(error instanceof Fail)) throw error
      ctx.io.err(
        `${error.message.replace(/^sed: (.*): No such file or directory$/, "sed: can't read $1: No such file or directory")}\n`,
      )
      code = 2
    }
  }

  return code
}

export const SED_COMMANDS = { sed }
