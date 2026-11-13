/**
 * Cuánto se calcula que lleva cada punto del curso de RAG, cada bloque, cada
 * nivel y el curso entero, con el modelo común de `@sanatorio/course`. Se lee
 * el texto en castellano y, donde los cursos de terminal cuentan órdenes, aquí
 * se cuenta lo que hay que decidir: cada mando que se puede tocar, cada número
 * que se calcula y cada cosa que se elige u ordena.
 */

import { estimateSeconds, wordsIn } from '@sanatorio/course'

import { ADVANCED } from './advanced.js'
import { BEGINNER } from './beginner.js'
import { INTERMEDIATE } from './intermediate.js'
import type { Task, Tier, UnitDef } from './types.js'

// Las mismas que `UNITS` de `index.ts`, sin importarlo (que él exporta esto).
const UNITS: readonly UnitDef[] = [...BEGINNER, ...INTERMEDIATE, ...ADVANCED]

/** Las decisiones de una tarea: lo que equivale a las órdenes de una terminal. */
function decisions(task: Task): number {
  switch (task.kind) {
    case 'tune':
      return task.knobs.length + task.solution.length
    case 'calc':
      return task.asks.length * 2
    case 'pick':
      return task.cases.length * 2
    case 'order':
      return task.show
    case 'api':
      return 3
  }
}

export function estimateOf(unit: UnitDef): number {
  const text = unit.es
  const theory = text.theory

  return estimateSeconds({
    kind: unit.kind,
    words: wordsIn(
      text.goal,
      theory?.what,
      theory?.how,
      theory?.when,
      theory?.whenNot,
      theory?.problems,
      text.example,
      text.frames,
      text.story,
      text.tasks,
    ),
    commands: unit.tasks.reduce((sum, task) => sum + decisions(task), 0),
    ...(unit.limit === undefined ? {} : { limit: unit.limit }),
  })
}

const sum = (units: readonly UnitDef[]): number =>
  units.reduce((total, unit) => total + estimateOf(unit), 0)

/** Un bloque: sus unidades y su jefe (el jefe final va aparte, con el nivel). */
export const estimateOfBlock = (n: number): number =>
  sum(UNITS.filter((unit) => unit.block === n && unit.kind !== 'final'))

/** Un nivel: sus tres bloques y su jefe final. */
export const estimateOfTier = (tier: Tier): number =>
  sum(UNITS.filter((unit) => unit.tier === tier))

export const estimateOfCourse = (): number => sum(UNITS)
