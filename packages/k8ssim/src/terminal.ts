/** La terminal del curso de Kubernetes: la shell simulada con `kubectl`, `helm`, `kustomize` y `base64`. */

import { Fail, run as runShell } from '@sanatorio/shellsim'
import type { CommandFn, Extension, RunResult, World } from '@sanatorio/shellsim'

import { readHost } from './common.js'
import { helm } from './helm.js'
import { kubectl, lookingKube } from './kubectl.js'
import { kustomize } from './kustomize.js'
import { hostHttp } from './net.js'
import { decode64, encode64 } from './util.js'

/** `base64` y `base64 -d` (para leer un Secret: `… -o jsonpath='{.data.X}' | base64 -d`). */
const base64: CommandFn = (ctx) => {
  const decode = ctx.args.some((arg) => arg === '-d' || arg === '--decode' || arg === '-D')
  const bad = ctx.args.find(
    (arg) => arg.startsWith('-') && !['-d', '--decode', '-D', '-w0'].includes(arg),
  )
  const file = ctx.args.find((arg) => !arg.startsWith('-'))

  if (bad !== undefined) throw new Fail(`base64: invalid option -- '${bad.replace(/^-+/, '')}'`, 1)

  const input = file === undefined ? ctx.io.stdin.readAll() : readHost(ctx, file, 'base64')

  ctx.io.out(decode ? decode64(input) : `${encode64(input)}\n`)

  return 0
}

/** Lo que la shell gana con este motor (`extend.ts` de shellsim). */
const EXTENSION: Extension = {
  commands: { kubectl, k: kubectl, helm, kustomize, base64 },
  looking: lookingKube,
  http: (world, host, port, path, headers) => hostHttp(world, host, port, path, headers ?? {}),
}

/** Ejecuta una orden en la terminal del curso de Kubernetes. */
export function run(world: World, entry: string): RunResult {
  return runShell(world, entry, EXTENSION)
}
