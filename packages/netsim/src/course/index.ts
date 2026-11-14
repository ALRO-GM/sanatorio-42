/** El camino del curso de redes: las unidades en orden y cómo leer cada una en un idioma. */

import { courseText } from '@sanatorio/course'

import { ADVANCED } from './advanced.js'
import { BEGINNER } from './beginner.js'
import { BLOCKS as BLOCKS_ES_EN } from './blocks.js'
import { BLOCKS_FR, UNITS_FR } from './fr/index.js'
import { INTERMEDIATE } from './intermediate.js'
import type { Block, Tier, Unit, UnitText } from './types.js'

/** El francés de algo, si lo hay (con `exactOptionalPropertyTypes`, un `undefined` no vale). */
const frOf = <T>(fr: T | undefined): { fr?: T } => (fr === undefined ? {} : { fr })

/** Las unidades con su francés: los textos de cada idioma se escriben aparte (`fr/`). */
export const UNITS: Unit[] = [...BEGINNER, ...INTERMEDIATE, ...ADVANCED].map((unit) => ({
  ...unit,
  ...frOf(UNITS_FR[unit.id]),
}))

export const BLOCKS: Block[] = BLOCKS_ES_EN.map((block) => ({
  ...block,
  ...frOf(BLOCKS_FR[block.n]),
}))

export function unitOf(id: string): Unit | undefined {
  return UNITS.find((unit) => unit.id === id)
}

/** Los textos de una unidad en ese idioma (el francés, si lo tiene; si no, el inglés; y el castellano para el resto). */
export function unitIn(unit: Unit, lang: string): UnitText {
  return courseText(unit, lang)
}

/** El jefe final que certifica cada nivel. */
export const FINALS: Record<Tier, string> = {
  beginner: 'net-final-beginner',
  intermediate: 'net-final-intermediate',
  advanced: 'net-final-advanced',
}

export const TIERS: readonly Tier[] = ['beginner', 'intermediate', 'advanced']

export {
  estimateOf,
  estimateOfBlock,
  estimateOfCourse,
  estimateOfTier,
  theoryWords,
} from './estimate.js'
export {
  checkAttempt,
  encodeEntry,
  evaluate,
  exampleOf,
  fieldsOf,
  goalKey,
  goalOf,
  questionsOf,
  schemeOf,
  solutionOf,
  starGoals,
  startOf,
  timeGoalsOf,
  wire,
} from './check.js'
export type { Attempt, Evaluation, ExampleRun, Field, FieldKind, Values } from './check.js'
export type { Ask, Block, Question, Scheme, Tier, Unit, UnitText } from './types.js'
