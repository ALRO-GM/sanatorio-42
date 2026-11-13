/**
 * Curso de NetPractice (módulo `netcourse`). Las unidades viven en
 * `@sanatorio/netsim`; lo que guarda y devuelve la API tiene la misma forma
 * que en el curso de shell. Cambia lo que viaja en un intento: no son órdenes
 * de terminal sino **comprobaciones** (cada vez que se pulsa «Comprobar», los
 * campos del esquema en JSON), y `commands` cuenta las que hicieron falta.
 */

import type {
  ShellAttemptInput,
  ShellAttemptResult,
  ShellBossStart,
  ShellCourse,
} from './shellcourse.js'

/** `GET /netcourse`: lo que llevas. */
export type NetCourse = ShellCourse

/** `POST /netcourse/units/:id`: las comprobaciones que hiciste, en orden (la última, la que acierta). */
export type NetAttemptInput = ShellAttemptInput

export type NetAttemptResult = ShellAttemptResult

/** `POST /netcourse/bosses/:id/start`: empieza (o vuelve a empezar) un contrarreloj. */
export type NetBossStart = ShellBossStart
