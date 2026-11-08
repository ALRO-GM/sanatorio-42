/**
 * Kubernetes simulado para el curso de Kubernetes de Not-games: la shell de
 * `@sanatorio/shellsim` con `kubectl`, `helm` y `kustomize` encima y dos
 * clústeres k3s de mentira. El mismo motor en la web (la terminal y los
 * ejemplos) y en la API (que vuelve a ejecutar cada intento). No ejecuta nada
 * de verdad: los objetos, los Pods y la red son JSON dentro del mundo de la
 * shell, y las imágenes son las que publica el curso de Docker.
 */

import { isIncomplete } from '@sanatorio/shellsim'
import type { RunResult, World } from '@sanatorio/shellsim'

export { run } from './terminal.js'
export { isIncomplete }
export type { RunResult, World }
export { LIMITS } from './limits.js'
export { teamImages } from './images.js'
export {
  BLOCKS,
  blockOf,
  checkAttempt,
  estimateOf,
  estimateOfBlock,
  estimateOfCourse,
  estimateOfTier,
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
