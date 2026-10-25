/**
 * Cuánto se tarda en un punto del curso: una estimación de partida, para
 * enseñar antes de empezar cuánto lleva cada nivel y el curso entero. Los
 * números de aquí son una suposición razonable, no una medida: la API guarda
 * el tiempo activo de quien supera cada punto (`course_times`) y con eso se
 * ajustarán (`docs/plantilla-cursos.md`). Se cambian solo aquí: la web y la
 * API usan esta misma función.
 */

import type { UnitKind } from './unit.js'

export const ESTIMATE = {
  /** Lectura de teoría, ejemplo e historia: palabras por minuto. */
  wordsPerMinute: 180,
  /** Abrir el punto, situarse, ver el ejemplo en marcha y probar por tu cuenta. */
  baseSeconds: 150,
  /** Cada orden de la solución: escribirla, leer la salida y pensar la siguiente. */
  secondsPerCommand: 40,
  /** Margen por lo que falla antes de salir (errores al escribir, probar). */
  unitSlack: 1.5,
  /** Un punto con remoto (esperar a la compañera, traer y subir). */
  remoteSeconds: 90,
  /** En un contrarreloj se suele acabar hacia los tres cuartos del límite… */
  bossShare: 0.75,
  /** …y repetir alguna vez: este factor cubre esos intentos de más. */
  bossRetries: 1.6,
  /** Una prueba de grupo del curso de git: el test, juntarse y la misión. */
  groupSeconds: 20 * 60,
} as const

export type EstimateInput = {
  kind: UnitKind
  /** Palabras que hay que leer (teoría, ejemplo, historia, tareas). */
  words: number
  /** Órdenes de la solución de referencia. */
  commands: number
  /** Segundos del contrarreloj, si lo es. */
  limit?: number
  /** Si el punto tiene remoto (curso de git). */
  remote?: boolean
}

/** Las palabras de unos textos (los que falten no cuentan). */
export function wordsIn(...texts: (string | readonly string[] | undefined)[]): number {
  return texts
    .flatMap((text) => (text === undefined ? [] : typeof text === 'string' ? [text] : text))
    .reduce((sum, text) => sum + (text.match(/\S+/g)?.length ?? 0), 0)
}

/** Los segundos que se calcula que lleva un punto, redondeados al minuto (uno como poco). */
export function estimateSeconds(point: EstimateInput): number {
  const reading = (point.words / ESTIMATE.wordsPerMinute) * 60
  const remote = point.remote === true ? ESTIMATE.remoteSeconds : 0
  const work =
    point.limit === undefined
      ? remote + point.commands * ESTIMATE.secondsPerCommand * ESTIMATE.unitSlack
      : point.limit * ESTIMATE.bossShare * ESTIMATE.bossRetries

  return Math.max(60, Math.round((ESTIMATE.baseSeconds + reading + work) / 60) * 60)
}
