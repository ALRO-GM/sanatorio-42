import type { CorrectionUnderstanding } from '@sanatorio/contracts'

/**
 * Las cuatro respuestas de «¿Qué tal entiendes el problema tras la corrección?»,
 * en el orden en que se enseñan. Los textos, en `net.rate.understanding.<id>`.
 */
export const UNDERSTANDINGS: readonly CorrectionUnderstanding[] = [
  'perfect',
  'enough',
  'better',
  'same',
]
