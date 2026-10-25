/**
 * Shell de Linux simulada para el curso de shell de Not-games. El mismo motor
 * en la web (la terminal y los ejemplos) y en la API (que vuelve a ejecutar
 * cada intento y calcula las estrellas). No ejecuta nada de verdad: todo pasa
 * en un objeto en memoria (`World`).
 */

export { LIMITS } from './limits.js'
export type { World } from './model.js'
export { isIncomplete, run } from './run.js'
export type { RunResult } from './interp.js'
export {
  BLOCKS,
  blockOf,
  checkAttempt,
  exampleOf,
  FINALS,
  goalOf,
  missing,
  starGoals,
  startOf,
  tally,
  TIERS,
  timeGoalsOf,
  unitIn,
  unitOf,
  UNITS,
} from './course/index.js'
export type { Attempt, Block, Tally, Tier, Unit, UnitText } from './course/index.js'
