/**
 * Cuánto se calcula que lleva cada punto del curso de redes, cada bloque, cada
 * nivel y el curso entero, con el modelo común de `@sanatorio/course`. Se lee
 * el texto en castellano y, en vez de órdenes, se cuenta lo que se rellena:
 * dos campos valen por una orden (una IP con su máscara, una ruta entera).
 */

import { estimateSeconds, wordsIn } from '@sanatorio/course'

import { ADVANCED } from './advanced.js'
import { BEGINNER } from './beginner.js'
import { fieldsOf } from './check.js'
import { INTERMEDIATE } from './intermediate.js'
import type { Tier, Unit } from './types.js'

// Las mismas que `UNITS` de `index.ts`, sin importarlo (que él exporta esto).
const UNITS: readonly Unit[] = [...BEGINNER, ...INTERMEDIATE, ...ADVANCED]

/** Las palabras de la teoría de una unidad (lo que limita `docs/plantilla-explicacion.md`). */
export function theoryWords(unit: Unit, lang: 'es' | 'en' = 'es'): number {
  const theory = unit[lang].theory

  return wordsIn(theory?.what, theory?.how, theory?.when, theory?.whenNot, theory?.problems)
}

export function estimateOf(unit: Unit): number {
  const text = unit.es

  return estimateSeconds({
    kind: unit.kind,
    words: theoryWords(unit) + wordsIn(text.goal, text.example, text.story, text.tasks),
    commands: Math.ceil(fieldsOf(unit).length / 2),
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
