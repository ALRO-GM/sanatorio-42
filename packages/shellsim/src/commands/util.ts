/** Lo que comparten los comandos: leer ficheros o la entrada, fechas y tamaños. */

import { Fail, readText } from '../fs.js'
import type { Ctx } from './types.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const pad = (n: number, width = 2): string => String(n).padStart(width, '0')

/** `Oct 25 09:00`, como `ls -l` (la hora del mundo, en UTC). */
export function lsDate(seconds: number): string {
  const d = new Date(seconds * 1000)

  return `${MONTHS[d.getUTCMonth()] ?? ''} ${String(d.getUTCDate()).padStart(2)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

/** `Oct 25 09:00:03`, como el registro. */
export function logDate(seconds: number): string {
  const d = new Date(seconds * 1000)

  return `${MONTHS[d.getUTCMonth()] ?? ''} ${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}

/** `date` con un formato `+%F %T` (lo que se usa en guiones y nombres de copia). */
export function formatDate(seconds: number, format?: string): string {
  const d = new Date(seconds * 1000)
  const parts: Record<string, string> = {
    Y: String(d.getUTCFullYear()),
    m: pad(d.getUTCMonth() + 1),
    d: pad(d.getUTCDate()),
    H: pad(d.getUTCHours()),
    M: pad(d.getUTCMinutes()),
    S: pad(d.getUTCSeconds()),
    F: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    T: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`,
    s: String(seconds),
    a: DAYS[d.getUTCDay()] ?? '',
    b: MONTHS[d.getUTCMonth()] ?? '',
    j: pad(Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000) + 1, 3),
    '%': '%',
  }

  if (format === undefined)
    return `${parts.a ?? ''} ${parts.b ?? ''} ${String(d.getUTCDate()).padStart(2)} ${parts.T ?? ''} UTC ${parts.Y ?? ''}`

  return format.replace(/%(.)/g, (all, c: string) => parts[c] ?? all)
}

/** `4.0K`, `1.2M`, `2.0G`: como `-h`. */
export function human(bytes: number): string {
  const units = ['', 'K', 'M', 'G', 'T']
  let value = bytes
  let unit = 0

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  if (unit === 0) return String(Math.round(value))

  return value < 10
    ? `${(Math.ceil(value * 10) / 10).toFixed(1)}${units[unit] ?? ''}`
    : `${Math.ceil(value)}${units[unit] ?? ''}`
}

/** Lo que leen los filtros: los ficheros que se nombran o, si no hay, la entrada. */
export function inputs(ctx: Ctx, files: string[]): { name: string; text: string }[] {
  if (files.length === 0 || (files.length === 1 && files[0] === '-'))
    return [{ name: '(standard input)', text: ctx.io.stdin.readAll() }]

  const sh = ctx.sh

  return files.map((file) => ({
    name: file,
    text:
      file === '-'
        ? ctx.io.stdin.readAll()
        : readText(sh.machine(), sh.user(), sh.abs(file), ctx.name, file),
  }))
}

/** Como `inputs`, pero un fichero que falla da su error y se sigue con los demás. */
export function eachInput(
  ctx: Ctx,
  files: string[],
  fn: (input: { name: string; text: string }) => void,
): number {
  let code = 0

  if (files.length === 0) {
    fn({ name: '(standard input)', text: ctx.io.stdin.readAll() })

    return 0
  }
  for (const file of files) {
    try {
      const [input] = inputs(ctx, [file])

      if (input !== undefined) fn(input)
    } catch (error) {
      if (!(error instanceof Fail)) throw error
      ctx.io.err(`${error.message}\n`)
      code = 1
    }
  }

  return code
}

/** Escapes de `echo -e` y `printf`: `\n`, `\t`, `\\`… */
export function escapes(text: string): string {
  return text.replace(/\\([nt\\abfrv0e]|x[0-9a-fA-F]{1,2})/g, (_all, c: string) => {
    if (c.startsWith('x')) return String.fromCharCode(parseInt(c.slice(1), 16))

    return (
      (
        {
          n: '\n',
          t: '\t',
          '\\': '\\',
          a: '\u0007',
          b: '\b',
          f: '\f',
          r: '\r',
          v: '\v',
          '0': '',
          e: '\u001b',
        } as Record<string, string>
      )[c] ?? c
    )
  })
}

/** `printf`: `%s %d %i %f %.2f %5s %-10s %x %o %c %b %%`; repite el formato si sobran argumentos. */
export function printf(format: string, args: string[]): string {
  let out = ''
  let index = 0
  const spec = /%([-+ 0#]*)(\d+)?(?:\.(\d+))?([sdifxXocbu%])/g

  do {
    const used = index

    out += escapes(format).replace(
      spec,
      (_all, flags: string, width?: string, precision?: string, kind?: string) => {
        if (kind === '%') return '%'

        const arg = args[index++] ?? ''
        let text: string

        switch (kind) {
          case 'd':
          case 'i':
          case 'u':
            text = String(Math.trunc(Number(arg) || 0))
            break
          case 'f':
            text = (Number(arg) || 0).toFixed(precision === undefined ? 6 : Number(precision))
            break
          case 'x':
            text = (Math.trunc(Number(arg)) || 0).toString(16)
            break
          case 'X':
            text = (Math.trunc(Number(arg)) || 0).toString(16).toUpperCase()
            break
          case 'o':
            text = (Math.trunc(Number(arg)) || 0).toString(8)
            break
          case 'c':
            text = arg.charAt(0)
            break
          case 'b':
            text = escapes(arg)
            break
          default:
            text = precision === undefined ? arg : arg.slice(0, Number(precision))
        }

        const size = Number(width ?? 0)

        if (text.length < size)
          text = flags.includes('-')
            ? text.padEnd(size)
            : text.padStart(size, flags.includes('0') && kind !== 's' ? '0' : ' ')

        return text
      },
    )
    if (index === used) break
  } while (index < args.length)

  return out
}
