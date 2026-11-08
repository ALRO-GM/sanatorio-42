/**
 * Curso de Kubernetes (módulo `k8scourse`). Las unidades viven en
 * `@sanatorio/k8ssim`; lo que guarda y devuelve la API tiene la misma forma
 * que en los cursos de shell y de Docker (los tres se corrigen igual:
 * volviendo a ejecutar las órdenes de la terminal).
 */

import type {
  ShellAttemptInput,
  ShellAttemptResult,
  ShellBossStart,
  ShellCourse,
} from './shellcourse.js'

/** `GET /k8scourse`: lo que llevas. */
export type K8sCourse = ShellCourse

/** `POST /k8scourse/units/:id`: las órdenes que escribiste, en orden. */
export type K8sAttemptInput = ShellAttemptInput

export type K8sAttemptResult = ShellAttemptResult

/** `POST /k8scourse/bosses/:id/start`: empieza (o vuelve a empezar) un contrarreloj. */
export type K8sBossStart = ShellBossStart
