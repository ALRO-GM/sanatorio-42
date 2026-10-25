/**
 * Procesar texto, lo que más se usa en el trabajo: `grep`, `head`, `tail`,
 * `wc`, `sort`, `uniq`, `cut`, `tr`, `xargs`, `diff`, `column`… Cada uno lee
 * los ficheros que se le dan o, si no hay, lo que le llega por la tubería.
 */

import { descendantsOf, Fail, lookup, writeText } from '../fs.js'
import { own } from '../limits.js'
import { arith } from '../expand.js'
import { literal, regex } from '../regex.js'
import type { Regex } from '../regex.js'
import { plainText } from './files.js'
import type { CommandFn, Ctx } from './types.js'
import { getopts, joinLines, linesOf } from './types.js'
import { eachInput, inputs } from './util.js'

/** `-n 5`, `-5`, `-n +3`: el número de líneas de head y tail. */
function count(ctx: Ctx): {
  n: number
  from: boolean
  files: string[]
  bytes: number | null
  follow: boolean
} {
  const args = ctx.args.map((arg) => (/^-\d+$/.test(arg) ? `-n${arg.slice(1)}` : arg))
  const { flags, values, rest } = getopts(args, 'nc', { lines: 'n', bytes: 'c', follow: 'f' })
  const raw = values.get('n') ?? '10'

  if (!/^[-+]?\d+$/.test(raw)) throw new Fail(`${ctx.name}: invalid number of lines: '${raw}'`)

  return {
    n: Math.abs(Number(raw)),
    from: raw.startsWith('+'),
    files: rest,
    bytes: values.has('c') ? Number(values.get('c')) : null,
    follow: flags.has('f') || flags.has('F'),
  }
}

const head: CommandFn = (ctx) => {
  const { n, files, bytes } = count(ctx)

  return eachInput(ctx, files, ({ name, text }) => {
    if (files.length > 1) ctx.io.out(`==> ${name} <==\n`)
    ctx.io.out(bytes !== null ? text.slice(0, bytes) : joinLines(linesOf(text).slice(0, n)))
  })
}

const tail: CommandFn = (ctx) => {
  const { n, from, files, bytes, follow } = count(ctx)
  const code = eachInput(ctx, files, ({ name, text }) => {
    if (files.length > 1) ctx.io.out(`==> ${name} <==\n`)

    const lines = linesOf(text)

    ctx.io.out(
      bytes !== null
        ? text.slice(-bytes)
        : joinLines(from ? lines.slice(Math.max(0, n - 1)) : n === 0 ? [] : lines.slice(-n)),
    )
  })

  if (follow)
    ctx.io.err(
      '(tail -f: en el simulador no se queda esperando; vuelve a mirarlo cuando quieras)\n',
    )

  return code
}

const wc: CommandFn = (ctx) => {
  const { flags, rest } = getopts(ctx.args, '', { lines: 'l', words: 'w', bytes: 'c', chars: 'm' })
  const all = !flags.has('l') && !flags.has('w') && !flags.has('c') && !flags.has('m')
  const totals = [0, 0, 0]
  const rows: string[] = []
  const format = (l: number, w: number, c: number, name: string) => {
    const parts: number[] = []

    if (all || flags.has('l')) parts.push(l)
    if (all || flags.has('w')) parts.push(w)
    if (all || flags.has('c') || flags.has('m')) parts.push(c)

    const single = parts.length === 1 && rest.length === 0
    const width = single
      ? 0
      : rest.length === 0
        ? 7
        : Math.max(String(Math.max(...totals, c)).length, 1)

    return `${parts.map((part) => String(part).padStart(width)).join(' ')}${name === '' ? '' : ` ${name}`}`
  }
  const code = eachInput(ctx, rest, ({ name, text }) => {
    const l = (text.match(/\n/g) ?? []).length
    const w = text.split(/\s+/).filter(Boolean).length
    const c = text.length

    totals[0] = (totals[0] ?? 0) + l
    totals[1] = (totals[1] ?? 0) + w
    totals[2] = (totals[2] ?? 0) + c
    rows.push(format(l, w, c, rest.length === 0 ? '' : name))
  })

  if (rest.length > 1) rows.push(format(totals[0] ?? 0, totals[1] ?? 0, totals[2] ?? 0, 'total'))
  ctx.io.out(joinLines(rows))

  return code
}

/** Las unidades de `sort -h`: 1K < 1M < 1G. */
function humanValue(text: string): number {
  const match = /^\s*([\d.]+)([KMGT]?)/i.exec(text)

  if (match === null) return 0

  const scale =
    { '': 1, K: 1024, M: 1024 ** 2, G: 1024 ** 3, T: 1024 ** 4 }[(match[2] ?? '').toUpperCase()] ??
    1

  return Number(match[1]) * scale
}

const sort: CommandFn = (ctx) => {
  const { flags, values, rest } = getopts(ctx.args, 'kto', {
    numeric: 'n',
    reverse: 'r',
    unique: 'u',
    key: 'k',
    'field-separator': 't',
    'human-numeric-sort': 'h',
    'ignore-case': 'f',
  })
  const lines = inputs(ctx, rest).flatMap(({ text }) => linesOf(text))
  const sep = values.get('t')
  const key = values.get('k')
  const keyOf = (line: string): string => {
    if (key === undefined) return line

    const [start = '1', end] = key.split(',')
    const a = Number.parseInt(start, 10)
    const b = end === undefined ? undefined : Number.parseInt(end, 10)
    const fields = sep === undefined ? line.trim().split(/\s+/) : line.split(sep)

    return fields.slice(a - 1, b).join(sep ?? ' ')
  }
  const numeric = flags.has('n') || (key ?? '').includes('n')
  const humanSort = flags.has('h') || (key ?? '').includes('h')
  const reverse = flags.has('r') || (key?.replace(/^\d+(,\d+)?/, '') ?? '').includes('r')
  const compare = (a: string, b: string): number => {
    ctx.sh.budget.tick()

    const ka = keyOf(a)
    const kb = keyOf(b)
    let result: number

    if (humanSort) result = humanValue(ka) - humanValue(kb)
    else if (numeric) result = (Number.parseFloat(ka) || 0) - (Number.parseFloat(kb) || 0)
    else {
      const x = flags.has('f') ? ka.toLowerCase() : ka
      const y = flags.has('f') ? kb.toLowerCase() : kb

      result = x < y ? -1 : x > y ? 1 : 0
    }

    // Como GNU sort: a igual clave, la línea entera decide (y el orden no depende de la entrada).
    if (result === 0 && !flags.has('s')) result = a < b ? -1 : a > b ? 1 : 0

    return reverse ? -result : result
  }

  let sorted = [...lines].sort(compare)

  if (flags.has('u'))
    sorted = sorted.filter(
      (line, index) =>
        index === 0 ||
        compare(sorted[index - 1] ?? '', line) !== 0 ||
        keyOf(line) !== keyOf(sorted[index - 1] ?? ''),
    )

  const out = values.get('o')

  if (out !== undefined) {
    // `sort -o f f` sí vale (a diferencia de `sort f > f`): lee todo antes de escribir.
    writeText(ctx.sh.machine(), ctx.sh.user(), ctx.sh.abs(out), joinLines(sorted), {
      cmd: 'sort',
      shown: out,
      now: ctx.sh.now(),
      umask: ctx.sh.session().umask,
    })

    return 0
  }
  ctx.io.out(joinLines(sorted))

  return 0
}

const uniq: CommandFn = (ctx) => {
  const { flags, rest } = getopts(ctx.args, '', {
    count: 'c',
    repeated: 'd',
    unique: 'u',
    'ignore-case': 'i',
  })
  const lines = inputs(ctx, rest.slice(0, 1)).flatMap(({ text }) => linesOf(text))
  const groups: { line: string; n: number }[] = []
  const same = (a: string, b: string) =>
    flags.has('i') ? a.toLowerCase() === b.toLowerCase() : a === b

  for (const line of lines) {
    const last = groups.at(-1)

    if (last !== undefined && same(last.line, line)) last.n++
    else groups.push({ line, n: 1 })
  }

  const shown = groups.filter((group) =>
    flags.has('d') ? group.n > 1 : flags.has('u') ? group.n === 1 : true,
  )

  ctx.io.out(
    joinLines(
      shown.map((group) =>
        flags.has('c') ? `${String(group.n).padStart(7)} ${group.line}` : group.line,
      ),
    ),
  )

  return 0
}

/** `1,3`, `2-4`, `3-`: las posiciones que pide `cut`. */
function ranges(spec: string): (n: number) => boolean {
  const parts = spec.split(',').map((part) => {
    const [a, b] = part.includes('-') ? part.split('-') : [part, part]
    const from = a === '' || a === undefined ? 1 : Number(a)
    const to = b === '' || b === undefined ? Infinity : Number(b)

    if (!Number.isFinite(from) || Number.isNaN(to))
      throw new Fail(`cut: invalid field value '${spec}'`)

    return [from, to] as const
  })

  return (n) => parts.some(([from, to]) => n >= from && n <= to)
}

const cut: CommandFn = (ctx) => {
  const { values, flags, rest } = getopts(ctx.args, 'dfc', {
    delimiter: 'd',
    fields: 'f',
    characters: 'c',
  })
  const delim = values.get('d') ?? '\t'
  const fields = values.get('f')
  const chars = values.get('c')

  if (fields === undefined && chars === undefined)
    throw new Fail('cut: you must specify a list of bytes, characters, or fields')
  if (delim.length !== 1) throw new Fail('cut: the delimiter must be a single character')

  const pick = ranges(fields ?? chars ?? '1')

  return eachInput(ctx, rest, ({ text }) => {
    const out = linesOf(text).flatMap((line) => {
      if (chars !== undefined)
        return [
          Array.from(line)
            .filter((_c, i) => pick(i + 1))
            .join(''),
        ]
      if (!line.includes(delim)) return flags.has('s') ? [] : [line]

      return [
        line
          .split(delim)
          .filter((_f, i) => pick(i + 1))
          .join(delim),
      ]
    })

    ctx.io.out(joinLines(out))
  })
}

/** Un conjunto de `tr`: `a-z`, `[:upper:]`, `\n`. */
function trSet(spec: string): string[] {
  const classes: Record<string, string> = {
    '[:upper:]': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    '[:lower:]': 'abcdefghijklmnopqrstuvwxyz',
    '[:digit:]': '0123456789',
    '[:space:]': ' \t\n\r\v\f',
    '[:blank:]': ' \t',
    '[:punct:]': '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
    '[:alpha:]': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    '[:alnum:]': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  }
  let text = spec

  for (const [name, chars] of Object.entries(classes)) text = text.replaceAll(name, chars)
  text = text.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\')

  const out: string[] = []

  for (let i = 0; i < text.length; i++) {
    const c = text[i] ?? ''

    if (text[i + 1] === '-' && text[i + 2] !== undefined) {
      const end = (text[i + 2] ?? '').charCodeAt(0)

      for (let code = c.charCodeAt(0); code <= end && out.length < 512; code++)
        out.push(String.fromCharCode(code))
      i += 2
    } else out.push(c)
  }

  return out
}

const tr: CommandFn = (ctx) => {
  const { flags, rest } = getopts(ctx.args, '', { delete: 'd', 'squeeze-repeats': 's' })
  const [from = '', to] = rest
  const set1 = trSet(from)
  const set2 = to === undefined ? [] : trSet(to)
  const text = ctx.io.stdin.readAll()
  let out = ''
  let last = ''

  if (rest.length === 0) throw new Fail('tr: missing operand')
  for (const c of text) {
    ctx.sh.budget.tick()

    const at = set1.indexOf(c)
    let next = c

    if (flags.has('d') && at >= 0) continue
    if (!flags.has('d') && at >= 0 && set2.length > 0)
      next = set2[Math.min(at, set2.length - 1)] ?? c
    if (flags.has('s') && next === last && (set2.length > 0 ? set2 : set1).includes(next)) continue
    out += next
    last = next
  }
  ctx.io.out(out)

  return 0
}

/* ---------- grep ---------- */

function grepCore(ctx: Ctx, zipped: boolean): number {
  const { flags, values, rest } = getopts(ctx.args, 'eABCm', {
    'ignore-case': 'i',
    'invert-match': 'v',
    'line-number': 'n',
    count: 'c',
    recursive: 'r',
    'files-with-matches': 'l',
    'files-without-match': 'L',
    'word-regexp': 'w',
    'line-regexp': 'x',
    'only-matching': 'o',
    'extended-regexp': 'E',
    'fixed-strings': 'F',
    quiet: 'q',
    silent: 'q',
    'no-filename': 'h',
    'with-filename': 'H',
    regexp: 'e',
    'after-context': 'A',
    'before-context': 'B',
    context: 'C',
    'max-count': 'm',
    include: 'I',
  })
  const ere = flags.has('E') || ctx.name === 'egrep'
  const patterns = values.has('e') ? [values.get('e') ?? ''] : rest.splice(0, 1)

  if (patterns.length === 0 || patterns[0] === undefined)
    throw new Fail(
      "Usage: grep [OPTION]... PATTERNS [FILE]...\nTry 'grep --help' for more information.",
      2,
    )

  let source = flags.has('F') || ctx.name === 'fgrep' ? literal(patterns[0]) : patterns[0]

  if (flags.has('w')) source = ere || flags.has('F') ? `\\b(${source})\\b` : `\\b\\(${source}\\)\\b`
  if (flags.has('x')) source = ere || flags.has('F') ? `^(${source})$` : `^\\(${source}\\)$`

  let re: Regex

  try {
    re = regex(source, { ere: ere || flags.has('F'), icase: flags.has('i') })
  } catch (error) {
    throw new Fail(
      `grep: ${error instanceof Error ? error.message.replace(/^regex: /, '') : 'bad pattern'}`,
      2,
    )
  }

  const include = values.get('I')
  const recursive = flags.has('r') || flags.has('R')
  const machine = ctx.sh.machine()
  const user = ctx.sh.user()
  let files = rest

  if (recursive) {
    if (files.length === 0) files = ['.']
    files = files.flatMap((target) => {
      const found = lookup(machine, user, ctx.sh.abs(target))

      if (found?.node.kind !== 'dir') return [target]

      return descendantsOf(machine, found.path)
        .filter((path) => own(machine.fs, path)?.kind === 'file')
        .filter(
          (path) =>
            include === undefined ||
            include.split(',').some((glob) => path.endsWith(glob.replace(/^\*/, ''))),
        )
        .map((path) =>
          target === '.'
            ? path.slice(found.path.length + 1)
            : `${target.replace(/\/$/, '')}${path.slice(found.path.length)}`,
        )
    })
  }

  const showName = !flags.has('h') && (flags.has('H') || files.length > 1 || recursive)
  const after = Number(values.get('A') ?? values.get('C') ?? 0)
  const before = Number(values.get('B') ?? values.get('C') ?? 0)
  const max = values.has('m') ? Number(values.get('m')) : Infinity
  // En un objeto: se cambia dentro de la función de cada fichero.
  const seen = { any: false }
  const out: string[] = []

  const code = eachInput(ctx, files, ({ name, text }) => {
    const found = lookup(machine, user, ctx.sh.abs(name))

    if (found?.node.kind === 'dir') {
      ctx.io.err(`grep: ${name}: Is a directory\n`)

      return
    }

    const lines = linesOf(zipped ? plainText(text) : text)
    let hits = 0
    let lastPrinted = -1
    let afterLeft = 0
    const prefix = (n: number, sep: string) =>
      `${showName ? `${name}${sep}` : ''}${flags.has('n') ? `${n + 1}${sep}` : ''}`

    for (let i = 0; i < lines.length && hits < max; i++) {
      const line = lines[i] ?? ''
      const match = re.test(line, ctx.sh.budget) !== flags.has('v')

      if (!match) {
        if (afterLeft > 0 && !flags.has('c') && !flags.has('l') && !flags.has('q')) {
          out.push(prefix(i, '-') + line)
          lastPrinted = i
          afterLeft--
        }
        continue
      }
      hits++
      seen.any = true
      if (flags.has('c') || flags.has('l') || flags.has('L') || flags.has('q')) continue
      if (before > 0) {
        const from = Math.max(lastPrinted + 1, i - before)

        if (lastPrinted >= 0 && from > lastPrinted + 1) out.push('--')
        for (let j = from; j < i; j++) out.push(prefix(j, '-') + (lines[j] ?? ''))
      } else if (after > 0 && lastPrinted >= 0 && i > lastPrinted + 1) out.push('--')
      if (flags.has('o') && !flags.has('v'))
        for (const each of re.all(line, ctx.sh.budget))
          out.push(prefix(i, ':') + line.slice(each.start, each.end))
      else out.push(prefix(i, ':') + line)
      lastPrinted = i
      afterLeft = after
    }
    if (flags.has('c')) out.push(`${showName ? `${name}:` : ''}${hits}`)
    if (flags.has('l') && hits > 0) out.push(name)
    if (flags.has('L') && hits === 0) out.push(name)
  })

  if (!flags.has('q')) ctx.io.out(joinLines(out))
  if (code !== 0 && !flags.has('s')) return 2

  return seen.any ? 0 : 1
}

const grep: CommandFn = (ctx) => grepCore(ctx, false)
const zgrep: CommandFn = (ctx) => grepCore(ctx, true)

/* ---------- Más filtros ---------- */

const xargs: CommandFn = (ctx) => {
  const { values, rest } = getopts(ctx.args, 'nIdL', {}, true)
  const text = ctx.io.stdin.readAll()
  const items = values.has('d')
    ? text.split(values.get('d') ?? '\n').filter(Boolean)
    : values.has('I') || values.has('L')
      ? linesOf(text)
      : text.split(/\s+/).filter(Boolean)
  const command = rest.length === 0 ? ['echo'] : rest
  const placeholder = values.get('I')
  const per =
    placeholder !== undefined ? 1 : Number(values.get('n') ?? values.get('L') ?? items.length) || 1
  let code = 0

  if (items.length === 0 && placeholder === undefined) return ctx.sh.runArgv(command, ctx.io)
  for (let i = 0; i < items.length; i += per) {
    const chunk = items.slice(i, i + per)
    const argv =
      placeholder !== undefined
        ? command.map((part) => part.replaceAll(placeholder, chunk[0] ?? ''))
        : [...command, ...chunk]

    if (ctx.sh.runArgv(argv, { ...ctx.io, tty: false }) !== 0) code = 123
  }

  return code
}

const diff: CommandFn = (ctx) => {
  const { flags, rest } = getopts(ctx.args)
  const [a, b] = rest

  if (a === undefined || b === undefined)
    throw new Fail(`diff: missing operand after '${a ?? 'diff'}'`, 2)

  const [left, right] = inputs(ctx, [a, b]).map(({ text }) => linesOf(text))
  const x = left ?? []
  const y = right ?? []

  if (x.length * y.length > 200_000)
    throw new Fail('diff: peer4u-sandbox: ficheros demasiado grandes para compararlos aquí', 2)

  // La subsecuencia común más larga, línea a línea.
  const table: number[][] = Array.from({ length: x.length + 1 }, () =>
    new Array<number>(y.length + 1).fill(0),
  )

  for (let i = x.length - 1; i >= 0; i--)
    for (let j = y.length - 1; j >= 0; j--) {
      ctx.sh.budget.tick()
      const row = table[i] ?? []
      const below = table[i + 1] ?? []

      row[j] = x[i] === y[j] ? (below[j + 1] ?? 0) + 1 : Math.max(below[j] ?? 0, row[j + 1] ?? 0)
    }

  const ops: { kind: ' ' | '-' | '+'; line: string; i: number; j: number }[] = []
  let i = 0
  let j = 0

  while (i < x.length || j < y.length) {
    if (i < x.length && j < y.length && x[i] === y[j])
      ops.push({ kind: ' ', line: x[i++] ?? '', i, j: j++ })
    else if (
      j < y.length &&
      (i >= x.length || (table[i]?.[j + 1] ?? 0) >= (table[i + 1]?.[j] ?? 0))
    )
      ops.push({ kind: '+', line: y[j++] ?? '', i, j })
    else ops.push({ kind: '-', line: x[i++] ?? '', i, j })
  }
  if (ops.every((op) => op.kind === ' ')) return 0
  if (flags.has('q')) {
    ctx.io.out(`Files ${a} and ${b} differ\n`)

    return 1
  }
  if (flags.has('u')) {
    ctx.io.out(
      `--- ${a}\n+++ ${b}\n@@ -1,${x.length} +1,${y.length} @@\n${joinLines(ops.map((op) => op.kind + op.line))}`,
    )

    return 1
  }
  ctx.io.out(
    joinLines(
      ops.filter((op) => op.kind !== ' ').map((op) => `${op.kind === '-' ? '<' : '>'} ${op.line}`),
    ),
  )

  return 1
}

const column: CommandFn = (ctx) => {
  const { flags, values, rest } = getopts(ctx.args, 's')
  const lines = inputs(ctx, rest).flatMap(({ text }) => linesOf(text))

  if (!flags.has('t')) {
    ctx.io.out(joinLines(lines))

    return 0
  }

  const sep = values.get('s')
  const rows = lines.map((line) => (sep === undefined ? line.trim().split(/\s+/) : line.split(sep)))
  const widths: number[] = []

  for (const row of rows)
    row.forEach((cell, index) => (widths[index] = Math.max(widths[index] ?? 0, cell.length)))
  ctx.io.out(
    joinLines(
      rows.map((row) =>
        row
          .map((cell, index) =>
            index === row.length - 1 ? cell : cell.padEnd((widths[index] ?? 0) + 2),
          )
          .join(''),
      ),
    ),
  )

  return 0
}

const nl: CommandFn = (ctx) => {
  let n = 0

  return eachInput(ctx, ctx.args, ({ text }) => {
    ctx.io.out(
      joinLines(
        linesOf(text).map((line) => (line === '' ? '' : `${String(++n).padStart(6)}\t${line}`)),
      ),
    )
  })
}

const rev: CommandFn = (ctx) =>
  eachInput(ctx, ctx.args, ({ text }) => {
    ctx.io.out(joinLines(linesOf(text).map((line) => Array.from(line).reverse().join(''))))
  })

const tac: CommandFn = (ctx) =>
  eachInput(ctx, ctx.args, ({ text }) => {
    ctx.io.out(joinLines(linesOf(text).reverse()))
  })

const paste: CommandFn = (ctx) => {
  const { flags, values, rest } = getopts(ctx.args, 'd')
  const delim = values.get('d') ?? '\t'
  const files = inputs(ctx, rest).map(({ text }) => linesOf(text))

  if (flags.has('s')) {
    ctx.io.out(joinLines(files.map((lines) => lines.join(delim))))

    return 0
  }

  const rows = Math.max(0, ...files.map((lines) => lines.length))

  ctx.io.out(
    joinLines(
      Array.from({ length: rows }, (_v, i) => files.map((lines) => lines[i] ?? '').join(delim)),
    ),
  )

  return 0
}

const seq: CommandFn = (ctx) => {
  const { values, rest } = getopts(ctx.args, 's')
  const nums = rest.map(Number)
  const [first = NaN, step = NaN, last = NaN] =
    nums.length === 1 ? [1, 1, nums[0]] : nums.length === 2 ? [nums[0], 1, nums[1]] : nums

  if ([first, step, last].some((n) => !Number.isFinite(n)) || step === 0)
    throw new Fail(`seq: invalid argument`)
  if (Math.abs((last - first) / step) > 1000)
    throw new Fail('seq: peer4u-sandbox: como mucho 1000 números')

  const out: string[] = []

  for (let n = first; step > 0 ? n <= last : n >= last; n += step) out.push(String(n))
  ctx.io.out(out.join(values.get('s') ?? '\n') + (out.length > 0 ? '\n' : ''))

  return 0
}

const yesNo: CommandFn = (ctx) => {
  ctx.io.err(`${ctx.name}: peer4u-sandbox: no se deja: escribiría sin parar\n`)

  return 1
}

/** `bc`, lo justo: una cuenta entera por línea (`paste -sd+ | bc` para sumar una columna). */
const bc: CommandFn = (ctx) => {
  const lines = inputs(
    ctx,
    ctx.args.filter((arg) => !arg.startsWith('-')),
  ).flatMap(({ text }) => linesOf(text))
  const env = {
    budget: ctx.sh.budget,
    get: () => undefined,
    set: () => undefined,
    special: () => undefined,
  }

  for (const line of lines) {
    if (line.trim() === '' || line.trim() === 'quit') continue
    try {
      ctx.io.out(`${arith(line, env)}\n`)
    } catch {
      ctx.io.err('(standard_in) 1: syntax error\n')
    }
  }

  return 0
}

/** `less` y `more` no paginan aquí: enseñan el fichero entero. */
const pager: CommandFn = (ctx) =>
  eachInput(
    ctx,
    ctx.args.filter((arg) => !arg.startsWith('-') && !arg.startsWith('+')),
    ({ text }) => {
      ctx.io.out(text)
    },
  )

export const TEXT_COMMANDS: Record<string, CommandFn> = {
  head,
  tail,
  wc,
  sort,
  uniq,
  cut,
  tr,
  grep,
  egrep: grep,
  fgrep: grep,
  zgrep,
  xargs,
  diff,
  column,
  nl,
  rev,
  tac,
  paste,
  seq,
  yes: yesNo,
  bc,
  less: pager,
  more: pager,
}
