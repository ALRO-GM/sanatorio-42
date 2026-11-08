/** El camino del curso de Docker: las unidades en orden y cómo leer cada una en un idioma. */

import { courseText } from '@sanatorio/course'

import { ADVANCED } from './advanced.js'
import { BEGINNER } from './beginner.js'
import { INTERMEDIATE } from './intermediate.js'
import type { Tier, Unit, UnitText } from './types.js'

export const UNITS: Unit[] = [...BEGINNER, ...INTERMEDIATE, ...ADVANCED]

export function unitOf(id: string): Unit | undefined {
  return UNITS.find((unit) => unit.id === id)
}

/** Los textos de una unidad en ese idioma (inglés para `en` y `fr`; si no, castellano). */
export function unitIn(unit: Unit, lang: string): UnitText {
  return courseText(unit, lang)
}

/** El jefe final que certifica cada nivel. */
export const FINALS: Record<Tier, string> = {
  beginner: 'docker-final-beginner',
  intermediate: 'docker-final-intermediate',
  advanced: 'docker-final-advanced',
}

export const TIERS: readonly Tier[] = ['beginner', 'intermediate', 'advanced']

export { BLOCKS, blockOf } from './blocks.js'
export { estimateOf, estimateOfBlock, estimateOfCourse, estimateOfTier } from './estimate.js'
export {
  checkAttempt,
  exampleOf,
  goalOf,
  missing,
  startOf,
  starGoals,
  tally,
  timeGoalsOf,
} from './check.js'
export type { Attempt, Tally } from './check.js'
export type { Block, Tier, Unit, UnitText } from './types.js'
