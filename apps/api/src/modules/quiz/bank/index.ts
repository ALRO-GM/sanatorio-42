/**
 * El banco entero de Not-games: todos los conceptos, de todos los temas.
 *
 * Añadir preguntas es añadir conceptos a un fichero de tema (o un fichero
 * nuevo, apuntado aquí). `tests/unit/quiz-bank.test.ts` comprueba que cada uno
 * está bien hecho: id único, formas con preguntas y buenas, malas suficientes
 * y ninguna buena entre las malas.
 */

import { C_BASICS } from './c-basics.js'
import { GENERAL } from './general.js'
import type { Concept } from './types.js'

export const BANK: readonly Concept[] = [...GENERAL, ...C_BASICS]
