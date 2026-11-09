/** La terminal del curso de Docker: la shell simulada con `docker`, `git` y los puertos publicados. */

import { run as runShell } from '@sanatorio/shellsim'
import type { CommandFn, Extension, RunResult, World } from '@sanatorio/shellsim'

import { docker, lookingDocker } from './docker.js'
import { envOfWorld } from './fsview.js'
import { git } from './git.js'
import { hostHttp, hostSocket } from './runtime.js'

/** Opciones de `curl` que llevan valor detrás (para encontrar la URL). */
const CURL_VALUE = new Set(['-o', '-X', '-d', '-w', '-H', '-A', '-u', '-m'])
const CURL_LONG_VALUE = new Set([
  '--output',
  '--request',
  '--data',
  '--write-out',
  '--header',
  '--user-agent',
  '--user',
  '--max-time',
])

function curlTarget(args: readonly string[]): { host: string; port: number } | null {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? ''

    if (CURL_VALUE.has(arg) || CURL_LONG_VALUE.has(arg)) i++
    else if (!arg.startsWith('-')) {
      const parsed = /^(?:(https?):\/\/)?([^/:]+)(?::(\d+))?/.exec(arg)

      if (parsed === null) return null

      return {
        host: parsed[2] ?? '',
        port: Number(parsed[3] ?? (parsed[1] === 'https' ? 443 : 80)),
      }
    }
  }

  return null
}

/**
 * `curl` del anfitrión: el de la shell, salvo en un puerto publicado que no
 * contesta HTTP, donde Docker acepta la conexión y la corta (o la cierra).
 */
const curl: CommandFn = (ctx) => {
  const env = envOfWorld(ctx.sh.world)
  const target = curlTarget(ctx.args)
  const socket = env === null || target === null ? null : hostSocket(env, target.host, target.port)

  if (socket === null) return ctx.sh.runArgv(['/usr/bin/curl', ...ctx.args], ctx.io)

  const silent =
    ctx.args.some((arg) => /^-[a-zA-Z]*s/.test(arg) || arg === '--silent') &&
    !ctx.args.some((arg) => /^-[a-zA-Z]*S/.test(arg) || arg === '--show-error')

  if (!silent)
    ctx.io.err(
      socket === 'reset'
        ? 'curl: (56) Recv failure: Connection reset by peer\n'
        : 'curl: (52) Empty reply from server\n',
    )

  return socket === 'reset' ? 56 : 52
}

/** Lo que la shell gana con este motor (`extend.ts` de shellsim). */
const EXTENSION: Extension = {
  commands: { docker, git, curl },
  looking: lookingDocker,
  http: (world, host, port, path) => {
    const env = envOfWorld(world)

    return env === null ? null : hostHttp(env, host, port, path)
  },
}

/** Ejecuta una orden en la terminal del curso de Docker. */
export function run(world: World, entry: string): RunResult {
  return runShell(world, entry, EXTENSION)
}
