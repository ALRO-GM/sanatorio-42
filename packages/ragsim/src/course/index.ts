/** El camino del curso de RAG: las unidades en orden y cómo leer cada una en un idioma. */

import { courseText } from '@sanatorio/course'

import { ADVANCED } from './advanced.js'
import { BEGINNER } from './beginner.js'
import { solutionOf } from './check.js'
import { INTERMEDIATE } from './intermediate.js'
import type { Tier, Unit, UnitDef, UnitText } from './types.js'

/**
 * La solución de cada unidad se calcula la primera vez que se pide (hay que
 * ejecutar el motor) y se guarda: así importar el curso no cuesta nada.
 */
function withSolution(unit: UnitDef): Unit {
  let solved: string[] | null = null

  return Object.defineProperty({ ...unit }, 'solution', {
    enumerable: true,
    get: () => (solved ??= solutionOf(unit)),
  }) as Unit
}

export const UNITS: Unit[] = [...BEGINNER, ...INTERMEDIATE, ...ADVANCED].map(withSolution)

export function unitOf(id: string): Unit | undefined {
  return UNITS.find((unit) => unit.id === id)
}

/** Los textos de una unidad en ese idioma (inglés para `en` y `fr`; si no, castellano). */
export function unitIn(unit: UnitDef, lang: string): UnitText {
  return courseText(unit, lang)
}

/** El jefe final que certifica cada nivel. */
export const FINALS: Record<Tier, string> = {
  beginner: 'rag-final-beginner',
  intermediate: 'rag-final-intermediate',
  advanced: 'rag-final-advanced',
}

export const TIERS: readonly Tier[] = ['beginner', 'intermediate', 'advanced']

export { BLOCKS, blockOf } from './blocks.js'
export { estimateOf, estimateOfBlock, estimateOfCourse, estimateOfTier } from './estimate.js'
export {
  accepts,
  askView,
  baseOf,
  caseView,
  checkAttempt,
  checkRun,
  encodeRun,
  exampleOf,
  KNOBS,
  measure,
  missing,
  objectivesOf,
  orderView,
  parseRun,
  respond,
  starGoals,
  tally,
  targetOf,
  timeGoalsOf,
  tuned,
} from './check.js'
export type {
  AskView,
  Attempt,
  CaseView,
  FrameView,
  KnobSpec,
  OrderView,
  Run,
  Tally,
} from './check.js'
export type {
  ApiTask,
  Ask,
  Block,
  BuildStep,
  CalcTask,
  Focus,
  Knob,
  Objective,
  OrderTask,
  PickCase,
  PickTask,
  Task,
  Tier,
  TuneTask,
  Unit,
  UnitDef,
  UnitText,
} from './types.js'
