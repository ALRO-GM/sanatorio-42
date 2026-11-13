/**
 * API de mentira: el curso de RAG. Se corrige como los de terminal
 * (`terminal-course.ts`): con el mismo motor que la API, aquí sobre las
 * comprobaciones del banco de pruebas. Empieza con las dos primeras unidades
 * superadas, para que la demostración enseñe el camino a medias.
 */

import { checkAttempt, FINALS, TIERS, UNITS } from '@sanatorio/ragsim'

import { terminalCourseMock } from './terminal-course'
import type { Api } from '../types'

const rag = terminalCourseMock({
  units: UNITS,
  finals: FINALS,
  tiers: TIERS,
  checkAttempt,
  doneBefore: 'rag-chunk-size',
})

export const ragCourseMock: Pick<Api, 'getRagCourse' | 'submitRagAttempt' | 'startRagBoss'> = {
  getRagCourse: rag.get,
  startRagBoss: rag.start,
  submitRagAttempt: rag.submit,
}
