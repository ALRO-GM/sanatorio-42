/**
 * El banco entero de Not-games: todos los conceptos, de todos los temas.
 *
 * Añadir preguntas es añadir conceptos a un fichero de tema (o un fichero
 * nuevo, apuntado aquí). `tests/unit/quiz-bank.test.ts` comprueba que cada uno
 * está bien hecho: id único, formas con preguntas y buenas, malas suficientes
 * y ninguna buena entre las malas.
 */

import { ALGORITHMS } from './algorithms.js'
import { C_BASICS } from './c-basics.js'
import { CPP } from './cpp.js'
import { GENERAL } from './general.js'
import { GRAPHICS } from './graphics.js'
import { NETWORK_BANK } from './network.js'
import { PYTHON } from './python.js'
import { REVIEW_A } from './review-a.js'
import { REVIEW_B } from './review-b.js'
import type { Concept, ReviewEntry } from './types.js'
import { UNIX } from './unix.js'

export type { Concept } from './types.js'

export const BANK: readonly Concept[] = [
  ...GENERAL,
  ...C_BASICS,
  ...UNIX,
  ...ALGORITHMS,
  ...GRAPHICS,
  ...NETWORK_BANK,
  ...CPP,
  ...PYTHON,
]

/** El repaso de cada concepto, por id. Un test comprueba que no falta ninguno. */
export const REVIEW: Readonly<Record<string, ReviewEntry>> = { ...REVIEW_A, ...REVIEW_B }
