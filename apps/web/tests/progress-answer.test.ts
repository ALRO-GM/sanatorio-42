/**
 * La primera capa del Avance (`features/stats/progressAnswer.ts`): la respuesta
 * en una frase frente a la media de tu campus.
 */
import { describe, expect, it } from 'vitest'

import type { StatsProgress } from '@sanatorio/contracts'

import { progressAnswer } from '../src/features/stats/progressAnswer'

/** Un Avance con días de 7 en 7, tu línea y la media de tu campus (plan C, quien sigue). */
function progress(
  mine: (number | null)[],
  average: (number | null)[],
  finished: number | null = null,
): StatsProgress {
  const days = average.map((_, index) => index * 7)
  const line = { circles: average, hours: average }

  return {
    days,
    track: 'classic',
    me: { line: { circles: mine, hours: mine }, hours: 0, finished, milestones: [] },
    home: 22,
    campuses: [
      {
        id: 22,
        name: 'Madrid',
        averages: {
          circles: {
            current: { classic: line.circles, next: [] },
            finished: { classic: [], next: [] },
            blackholed: { classic: [], next: [] },
          },
          hours: {
            current: { classic: line.hours, next: [] },
            finished: { classic: [], next: [] },
            blackholed: { classic: [], next: [] },
          },
        },
      },
    ],
  } as unknown as StatsProgress
}

describe('Avance: la respuesta en una frase', () => {
  it('por delante: llegas antes de lo que llega la media', () => {
    expect(progressAnswer(progress([0, 20, 40, null], [0, 10, 20, 30, 40, 50]), null)).toEqual({
      kind: 'ahead',
      weeks: 2,
    })
  })

  it('por detrás, a la par y por delante de todo', () => {
    expect(progressAnswer(progress([0, 5, 10, 10, 20], [0, 10, 20, 30, 40]), null)).toEqual({
      kind: 'behind',
      weeks: 2,
    })
    expect(progressAnswer(progress([0, 10, 20], [0, 10, 20]), null)).toEqual({ kind: 'even' })
    expect(progressAnswer(progress([0, 60], [0, 10, 20]), null)).toEqual({ kind: 'beyond' })
  })

  it('terminado: en cuántos meses, y la media si llega', () => {
    expect(progressAnswer(progress([0, 100], [0, 50, 100], 365), null)).toEqual({
      kind: 'finished',
      months: 12,
      average: 0,
    })
  })

  it('sin nada aprobado aún, o sin línea, no hay frase', () => {
    expect(progressAnswer(progress([0, 0], [0, 10]), null)).toBeNull()
    expect(progressAnswer({ ...progress([0], [0]), me: null }, null)).toBeNull()
  })
})
