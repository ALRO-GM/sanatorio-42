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
import { COURSES } from './courses.js'
import { CPP } from './cpp.js'
import { GIT } from './git.js'
import { GENERAL } from './general.js'
import { GRAPHICS } from './graphics.js'
import { NETWORK_BANK } from './network.js'
import { PYTHON } from './python.js'
import { REVIEW_A } from './review-a.js'
import { REVIEW_B } from './review-b.js'
import { REVIEW_COURSES } from './review-courses.js'
import { REVIEW_GIT } from './review-git.js'
import { PISCINE_SHELL } from './piscine-shell.js'
import { PISCINE_C00_C03 } from './piscine-c00-c03.js'
import { PISCINE_C04_C07 } from './piscine-c04-c07.js'
import { PISCINE_C08_C13 } from './piscine-c08-c13.js'
import { REVIEW_PISCINE_SHELL } from './review-piscine-shell.js'
import { REVIEW_PISCINE_C00_C03 } from './review-piscine-c00-c03.js'
import { REVIEW_PISCINE_C04_C07 } from './review-piscine-c04-c07.js'
import { REVIEW_PISCINE_C08_C13 } from './review-piscine-c08-c13.js'
import { REVIEW_CORE_C } from './review-core-c.js'
import { REVIEW_CORE_ALGO } from './review-core-algo.js'
import { REVIEW_CORE_NET } from './review-core-net.js'
import { REVIEW_CORE_CPP } from './review-core-cpp.js'
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
  ...GIT,
  ...COURSES,
  ...PISCINE_SHELL,
  ...PISCINE_C00_C03,
  ...PISCINE_C04_C07,
  ...PISCINE_C08_C13,
]

/** El repaso de cada concepto, por id. Un test comprueba que no falta ninguno. */
export const REVIEW: Readonly<Record<string, ReviewEntry>> = {
  ...REVIEW_A,
  ...REVIEW_B,
  ...REVIEW_GIT,
  ...REVIEW_COURSES,
  ...REVIEW_PISCINE_SHELL,
  ...REVIEW_PISCINE_C00_C03,
  ...REVIEW_PISCINE_C04_C07,
  ...REVIEW_PISCINE_C08_C13,
  ...REVIEW_CORE_C,
  ...REVIEW_CORE_ALGO,
  ...REVIEW_CORE_NET,
  ...REVIEW_CORE_CPP,
}
