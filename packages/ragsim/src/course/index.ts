/** El camino del curso de RAG: las unidades en orden y cómo leer cada una en un idioma. */

import { courseText } from '@sanatorio/course'

import { ADVANCED } from './advanced.js'
import { BEGINNER } from './beginner.js'
import { BLOCKS as BLOCKS_ES_EN } from './blocks.js'
import { solutionOf } from './check.js'
import { BLOCKS_FR, UNITS_FR } from './fr/index.js'
import { INTERMEDIATE } from './intermediate.js'
import type { Block, Tier, Unit, UnitDef, UnitText } from './types.js'

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

/** El francés de algo, si lo hay (con `exactOptionalPropertyTypes`, un `undefined` no vale). */
const frOf = <T>(fr: T | undefined): { fr?: T } => (fr === undefined ? {} : { fr })

/** Las unidades con su francés: los textos de cada idioma se escriben aparte (`fr/`). */
export const UNITS: Unit[] = [...BEGINNER, ...INTERMEDIATE, ...ADVANCED]
  .map((unit) => ({ ...unit, ...frOf(UNITS_FR[unit.id]) }))
  .map(withSolution)

export const BLOCKS: Block[] = BLOCKS_ES_EN.map((block) => ({
  ...block,
  ...frOf(BLOCKS_FR[block.n]),
}))

export function blockOf(n: number): Block | undefined {
  return BLOCKS.find((block) => block.n === n)
}

export function unitOf(id: string): Unit | undefined {
  return UNITS.find((unit) => unit.id === id)
}

/** Los textos de una unidad en ese idioma (el francés, si lo tiene; si no, el inglés; y el castellano para el resto). */
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
