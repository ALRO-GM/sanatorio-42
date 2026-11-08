/** La terminal del curso de Docker: la shell simulada con `docker`, `git` y los puertos publicados. */

import { run as runShell } from '@sanatorio/shellsim'
import type { Extension, RunResult, World } from '@sanatorio/shellsim'

import { docker, lookingDocker } from './docker.js'
import { envOfWorld } from './fsview.js'
import { git } from './git.js'
import { hostHttp } from './runtime.js'

/** Lo que la shell gana con este motor (`extend.ts` de shellsim). */
const EXTENSION: Extension = {
  commands: { docker, git },
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
