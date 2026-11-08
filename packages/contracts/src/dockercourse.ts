/**
 * Curso de Docker (módulo `dockercourse`). Las unidades viven en
 * `@sanatorio/dockersim`; lo que guarda y devuelve la API tiene la misma forma
 * que en el curso de shell (los dos se corrigen igual: volviendo a ejecutar
 * las órdenes de la terminal).
 */

import type {
  ShellAttemptInput,
  ShellAttemptResult,
  ShellBossStart,
  ShellCourse,
} from './shellcourse.js'

/** `GET /dockercourse`: lo que llevas. */
export type DockerCourse = ShellCourse

/** `POST /dockercourse/units/:id`: las órdenes que escribiste, en orden. */
export type DockerAttemptInput = ShellAttemptInput

export type DockerAttemptResult = ShellAttemptResult

/** `POST /dockercourse/bosses/:id/start`: empieza (o vuelve a empezar) un contrarreloj. */
export type DockerBossStart = ShellBossStart
