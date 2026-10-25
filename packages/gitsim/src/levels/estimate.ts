/**
 * Cuánto se calcula que lleva cada punto del curso de git, cada mundo (con las
 * pruebas de grupo que lo cierran) y el curso entero, con el modelo común de
 * `@sanatorio/course`. Se lee el texto en castellano y se cuentan los comandos
 * de la solución; los puntos con remoto llevan algo más.
 */

import { ESTIMATE, estimateSeconds, wordsIn } from '@sanatorio/course'

import { WORLD_0, WORLD_1 } from './basics.js'
import { GATES } from './gates.js'
import { WORLD_2, WORLD_3, WORLD_4, WORLD_5 } from './shared.js'
import type { Level } from './types.js'

// Los mismos que `LEVELS` de `index.ts`, sin importarlo (que él exporta esto).
const LEVELS: readonly Level[] = [
  ...WORLD_0,
  ...WORLD_1,
  ...WORLD_2,
  ...WORLD_3,
  ...WORLD_4,
  ...WORLD_5,
]

export function estimateOfLevel(level: Level): number {
  const theory = level.theory

  return estimateSeconds({
    kind: 'unit',
    words: wordsIn(
      level.goal,
      theory.what,
      theory.how,
      theory.when,
      theory.whenNot,
      theory.problems,
      theory.looks,
    ),
    commands: level.solution.length,
    remote: level.remote !== undefined,
  })
}

/** Una prueba de grupo o el jefe: el test previo, juntarse y la misión. */
export const estimateOfGate = (): number => ESTIMATE.groupSeconds

/** Un mundo: sus puntos y las pruebas de grupo que van detrás de él. */
export function estimateOfWorld(world: number): number {
  const levels = LEVELS.filter((level) => level.world === world)
  const ids = new Set(levels.map((level) => level.id))
  const gates = GATES.filter((gate) => ids.has(gate.after)).length

  return levels.reduce((sum, level) => sum + estimateOfLevel(level), 0) + gates * estimateOfGate()
}

/** Los mundos que hay, en orden. */
export const WORLDS: readonly number[] = [...new Set(LEVELS.map((level) => level.world))]

export const estimateOfGitCourse = (): number =>
  WORLDS.reduce((sum, world) => sum + estimateOfWorld(world), 0)
