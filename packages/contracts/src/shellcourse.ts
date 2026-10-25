/**
 * Curso de shell de Linux (Not-games). Las unidades (teoría, ejemplo,
 * prueba) viven en `@sanatorio/shellsim`; aquí solo lo que guarda y devuelve
 * la API.
 */

import type { CourseBest, CourseCertificate, CourseRun, CourseStars } from './course.js'

/** `GET /shellcourse`: lo que llevas. */
export type ShellCourse = {
  /** Por cada punto superado, sus mejores estrellas. */
  stars: Record<string, CourseStars>
  best: Record<string, CourseBest>
  /** Los contrarrelojes empezados que siguen en plazo. */
  runs: Record<string, CourseRun>
  /** Los niveles certificados (jefes finales superados). */
  certificates: CourseCertificate[]
}

/** `POST /shellcourse/units/:id`: las órdenes que escribiste, en orden. */
export type ShellAttemptInput = { entries: string[] }

export type ShellAttemptResult = {
  done: boolean
  stars: 0 | CourseStars
  /** Los comandos que contaron (los que salen bien y no son solo mirar). */
  commands: number
  /** En un contrarreloj, los segundos que midió la API. */
  seconds: number | null
  /** Qué falta: `file:/ruta`, `service:nginx`, `output`, `time`… */
  misses: string[]
  course: ShellCourse
}

/** `POST /shellcourse/bosses/:id/start`: empieza (o vuelve a empezar) un contrarreloj. */
export type ShellBossStart = { unit: string; run: CourseRun; course: ShellCourse }
