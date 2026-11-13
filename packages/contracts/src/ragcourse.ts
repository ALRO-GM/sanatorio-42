/**
 * Curso de RAG (módulo `ragcourse`). Las unidades viven en
 * `@sanatorio/ragsim`; lo que guarda y devuelve la API tiene la misma forma
 * que en los cursos de terminal, y se corrige igual: volviendo a ejecutar lo
 * enviado. Aquí cada entrada no es una orden sino una **comprobación** del
 * banco de pruebas: un JSON con los mandos, los números o lo elegido.
 */

import type {
  ShellAttemptInput,
  ShellAttemptResult,
  ShellBossStart,
  ShellCourse,
} from './shellcourse.js'

/** `GET /ragcourse`: lo que llevas. */
export type RagCourse = ShellCourse

/** `POST /ragcourse/units/:id`: las comprobaciones que hiciste, en orden. */
export type RagAttemptInput = ShellAttemptInput

/** `commands` son las comprobaciones que contaron; `misses`, `task:N` por cada tarea sin salir (o `time`). */
export type RagAttemptResult = ShellAttemptResult

/** `POST /ragcourse/bosses/:id/start`: empieza (o vuelve a empezar) un contrarreloj. */
export type RagBossStart = ShellBossStart
