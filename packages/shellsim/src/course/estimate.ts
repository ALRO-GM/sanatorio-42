/**
 * Cuánto se calcula que lleva cada punto del curso de shell, cada bloque,
 * cada nivel y el curso entero, con el modelo común de `@sanatorio/course`.
 * Se lee el texto en castellano (el inglés dice lo mismo con parecidas
 * palabras) y se cuenta lo que se escribe: las órdenes de la solución.
 */

import { estimateSeconds, wordsIn } from '@sanatorio/course'

import { ADVANCED } from './advanced.js'
import { BEGINNER } from './beginner.js'
import { INTERMEDIATE } from './intermediate.js'
import type { Tier, Unit } from './types.js'

// Las mismas que `UNITS` de `index.ts`, sin importarlo (que él exporta esto).
const UNITS: readonly Unit[] = [...BEGINNER, ...INTERMEDIATE, ...ADVANCED]

export function estimateOf(unit: Unit): number {
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
      unit.example,
      text.story,
      text.tasks,
    ),
    commands: unit.solution.length,
    ...(unit.limit === undefined ? {} : { limit: unit.limit }),
  })
}

const sum = (units: readonly Unit[]): number =>
  units.reduce((total, unit) => total + estimateOf(unit), 0)

/** Un bloque: sus unidades y su jefe (el jefe final va aparte, con el nivel). */
export const estimateOfBlock = (n: number): number =>
  sum(UNITS.filter((unit) => unit.block === n && unit.kind !== 'final'))

/** Un nivel: sus tres bloques y su jefe final. */
export const estimateOfTier = (tier: Tier): number =>
  sum(UNITS.filter((unit) => unit.tier === tier))

export const estimateOfCourse = (): number => sum(UNITS)
