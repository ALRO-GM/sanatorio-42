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
import type { Concept } from './types.js'
import { UNIX } from './unix.js'

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
