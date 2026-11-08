/**
 * Leer las opciones como `kubectl`: `-n tienda`, `--namespace=tienda`,
 * `-o yaml`, `-oyaml`, `-it`, `--from-literal=A=1` repetida, y lo que va
 * detrás de `--` (la orden de `run`, `exec` o `create job`). Una opción que no
 * existe da el error de verdad («unknown flag: --replica»).
 */

import { Fail } from '@sanatorio/shellsim'

export type Args = {
  rest: string[]
  /** Lo que va detrás de `--`. */
  command: string[]
  has: (name: string) => boolean
  one: (name: string) => string | undefined
  all: (name: string) => string[]
}

export type FlagSpec = {
  /** Opciones que llevan valor (nombre largo). */
  values: readonly string[]
  /** Opciones sin valor. */
  flags: readonly string[]
  /** Cortas → largas (`n` → `namespace`). */
  shorts?: Readonly<Record<string, string>>
}

/** Las que valen en cualquier orden de kubectl. */
const GLOBAL_VALUES = ['namespace', 'context', 'kubeconfig', 'request-timeout']
const GLOBAL_FLAGS = ['all-namespaces', 'help']
const GLOBAL_SHORTS: Record<string, string> = { n: 'namespace', A: 'all-namespaces', h: 'help' }

export function parseArgs(args: readonly string[], spec: FlagSpec, usage: string): Args {
  const values = new Set([...spec.values, ...GLOBAL_VALUES])
  const flags = new Set([...spec.flags, ...GLOBAL_FLAGS])
  const shorts: Record<string, string> = { ...GLOBAL_SHORTS, ...spec.shorts }
  const opts = new Map<string, string[]>()
  const rest: string[] = []
  let command: string[] = []
  const add = (name: string, value: string) => {
    opts.set(name, [...(opts.get(name) ?? []), value])
  }
  const unknown = (flag: string): never => {
    throw new Fail(
      `error: unknown ${flag.startsWith('--') ? 'flag' : 'shorthand flag'}: '${flag.replace(/^-+/, '').split('=')[0] ?? ''}' in ${flag}\nSee '${usage} --help' for usage.`,
      1,
    )
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? ''

    if (arg === '--') {
      command = args.slice(i + 1)
      break
    }
    if (arg.startsWith('--') && arg.length > 2) {
      const [name = '', value] = arg.slice(2).split(/=(.*)/s)

      if (values.has(name)) {
        if (value === undefined && i + 1 >= args.length)
          throw new Fail(`error: flag needs an argument: --${name}`, 1)
        add(name, value ?? args[++i] ?? '')
      } else if (flags.has(name)) add(name, value ?? 'true')
      else unknown(arg)
      continue
    }
    if (arg.startsWith('-') && arg.length > 1 && !/^-\d/.test(arg)) {
      for (let j = 1; j < arg.length; j++) {
        const name = shorts[arg[j] ?? '']

        if (name === undefined) unknown(`-${arg[j] ?? ''}`)

        const long = name ?? ''

        if (values.has(long)) {
          const value = arg.slice(j + 1).replace(/^=/, '')

          if (value === '' && i + 1 >= args.length)
            throw new Fail(
              `error: flag needs an argument: '${arg[j] ?? ''}' in -${arg[j] ?? ''}`,
              1,
            )
          add(long, value !== '' ? value : (args[++i] ?? ''))
          break
        }
        add(long, 'true')
      }
      continue
    }
    rest.push(arg)
  }

  return {
    rest,
    command,
    has: (name) => opts.has(name) && opts.get(name)?.at(-1) !== 'false',
    one: (name) => opts.get(name)?.at(-1),
    all: (name) => opts.get(name) ?? [],
  }
}

/** Segundos de un `--timeout=60s` (`2m`, `90s`, `1m30s`). */
export function seconds(text: string | undefined, fallback: number): number {
  if (text === undefined) return fallback

  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(text.trim())

  if (match === null || text.trim() === '')
    throw new Fail(
      `error: invalid argument "${text}" for "--timeout" flag: time: invalid duration "${text}"`,
      1,
    )

  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
}
