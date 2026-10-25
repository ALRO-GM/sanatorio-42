/**
 * Lo que recibe cada comando simulado: sus argumentos, la entrada y las dos
 * salidas, y la shell (el mundo, quién lo ejecuta, la carpeta actual). Un
 * comando devuelve su código de salida; si algo va mal lanza `Fail` con el
 * mensaje de error de verdad («ls: cannot access 'x': No such file…»).
 */

import type { Budget } from '../limits.js'
import type { Machine, Session, User, World } from '../model.js'

/** La entrada de un comando: se puede leer entera o línea a línea (`read`). */
export class Stream {
  private pos = 0

  constructor(private readonly text: string) {}

  readAll(): string {
    const rest = this.text.slice(this.pos)

    this.pos = this.text.length

    return rest
  }

  readLine(): string | null {
    if (this.pos >= this.text.length) return null

    const end = this.text.indexOf('\n', this.pos)
    const line = this.text.slice(this.pos, end < 0 ? this.text.length : end)

    this.pos = end < 0 ? this.text.length : end + 1

    return line
  }
}

/** `tty`: la salida va a la pantalla (no a una tubería ni a un fichero), como `isatty`. */
export type Io = {
  stdin: Stream
  out: (text: string) => void
  err: (text: string) => void
  tty?: boolean
}

export type ShellApi = {
  world: World
  budget: Budget
  machine: () => Machine
  /** Quien ejecuta ahora (con `sudo`, root). */
  user: () => User
  session: () => Session
  now: () => number
  abs: (path: string) => string
  /** Ejecuta unos argumentos ya expandidos (lo usan sudo, xargs, find -exec, time…). */
  runArgv: (argv: string[], io: Io, as?: string) => number
  /** Ejecuta código de shell en otra máquina (`ssh host 'orden'`). */
  runRemote: (host: string, user: string, src: string, io: Io) => number
  /** Abre una sesión encima (`ssh host`, `sudo -i`, `su`). */
  pushSession: (host: string, user: string) => void
  /** Apunta una línea en el registro de la máquina. */
  log: (unit: string, prio: number, msg: string, machine?: Machine) => void
  /** El número de proceso siguiente. */
  pid: (machine?: Machine) => number
}

export type Ctx = { name: string; args: string[]; io: Io; sh: ShellApi }

export type CommandFn = (ctx: Ctx) => number

/**
 * Opciones cortas y largas al estilo de getopt: `-la` = `-l -a`, `-n 5`,
 * `-n5`, `--lines=5`. `withValue` dice qué opciones llevan valor.
 */
export function getopts(
  args: string[],
  withValue = '',
  longs: Record<string, string> = {},
  /** Parar en el primer argumento que no es opción (`sudo`, `xargs`, `ssh`: lo de detrás es otra orden). */
  stop = false,
): { flags: Set<string>; values: Map<string, string>; rest: string[] } {
  const flags = new Set<string>()
  const values = new Map<string, string>()
  const rest: string[] = []
  const takes = new Set(withValue.split(''))

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? ''

    if (arg === '--') {
      rest.push(...args.slice(i + 1))
      break
    }
    if (arg.startsWith('--') && arg.length > 2) {
      const [name = '', value] = arg.slice(2).split(/=(.*)/s)
      const short = longs[name] ?? name

      if (value !== undefined) values.set(short, value)
      else if (takes.has(short) && longs[name] !== undefined) values.set(short, args[++i] ?? '')
      else flags.add(short)
      continue
    }
    if (arg.startsWith('-') && arg.length > 1 && !/^-\d/.test(arg)) {
      for (let j = 1; j < arg.length; j++) {
        const c = arg[j] ?? ''

        if (takes.has(c)) {
          const value = arg.slice(j + 1)

          values.set(c, value !== '' ? value : (args[++i] ?? ''))
          break
        }
        flags.add(c)
      }
      continue
    }
    rest.push(arg)
    if (stop) {
      rest.push(...args.slice(i + 1))
      break
    }
  }

  return { flags, values, rest }
}

/** Divide un texto en líneas (sin la vacía del final). */
export function linesOf(text: string): string[] {
  if (text === '') return []

  const lines = text.split('\n')

  if (lines.at(-1) === '') lines.pop()

  return lines
}

/** Une líneas con su salto final. */
export const joinLines = (lines: readonly string[]): string =>
  lines.length === 0 ? '' : `${lines.join('\n')}\n`
