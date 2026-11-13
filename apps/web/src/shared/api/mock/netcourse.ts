/**
 * API de mentira: el curso de NetPractice. Se corrige como los de terminal
 * (`terminal-course.ts`), con el motor de redes: lo que llega son las
 * comprobaciones hechas y `solution` es la única que haría falta. Empieza con
 * el primer bloque superado, para que la demostración enseñe el camino a
 * medias, con las cuentas hechas y los esquemas por delante.
 */

import {
  checkAttempt,
  encodeEntry,
  FINALS,
  solutionOf,
  TIERS,
  unitOf,
  UNITS,
} from '@sanatorio/netsim'

import { terminalCourseMock } from './terminal-course'
import type { Api } from '../types'

const net = terminalCourseMock({
  units: UNITS.map((unit) => ({
    id: unit.id,
    solution: [encodeEntry(solutionOf(unit))],
    ...(unit.limit === undefined ? {} : { limit: unit.limit }),
  })),
  finals: FINALS,
  tiers: TIERS,
  checkAttempt: (point, entries, seconds) => {
    const unit = unitOf(point.id)

    return unit === undefined
      ? { done: false, misses: [], stars: 0, commands: 0 }
      : checkAttempt(unit, entries, seconds)
  },
  doneBefore: 'net-pair',
})

export const netCourseMock: Pick<Api, 'getNetCourse' | 'submitNetAttempt' | 'startNetBoss'> = {
  getNetCourse: net.get,
  startNetBoss: net.start,
  submitNetAttempt: net.submit,
}
