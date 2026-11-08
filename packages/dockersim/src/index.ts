/**
 * Docker simulado para el curso de Docker de Not-games: la shell de
 * `@sanatorio/shellsim` con `docker`, `docker compose` y un `git` mínimo
 * encima. El mismo motor en la web (la terminal y los ejemplos) y en la API
 * (que vuelve a ejecutar cada intento). No ejecuta nada de verdad: imágenes,
 * contenedores y registro son JSON dentro del mundo de la shell.
 */

import { isIncomplete } from '@sanatorio/shellsim'
import type { RunResult, World } from '@sanatorio/shellsim'

export { run } from './terminal.js'
export { isIncomplete }
export type { RunResult, World }
export { LIMITS } from './limits.js'
export { registryImages } from './registry.js'
export type { PublishedImage } from './registry.js'
// Lo que reutiliza el curso de Kubernetes (`@sanatorio/k8ssim`): las imágenes
// públicas del catálogo, cómo se escribe una referencia y el lector de YAML.
export { fromCatalog, normalizeRef, repoDigest, validRef } from './catalog.js'
export { parseYaml, YamlError } from './yaml.js'
export type { Yaml } from './yaml.js'
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
