/**
 * El tiempo activo en los cursos (`course_times`, `docs/plantilla-cursos.md`):
 * una fila cada vez que alguien supera un punto, del curso de shell o del de
 * git, con lo que tardó de verdad y lo que se estimaba. Vive aquí porque este
 * módulo declara la tabla como dato personal; el de git lo importa de su
 * `index.ts`. Nadie más lo lee: servirá para calibrar las estimaciones.
 */

import { z } from 'zod'

import type { Db } from '../../core/db/database.js'

/** Lo que admite la API del navegador: segundos enteros, como mucho seis horas. */
export const activeSecondsSchema = z
  .number()
  .int()
  .min(0)
  .max(6 * 3600)
  .optional()

type CourseTime = {
  login: string
  course: 'git' | 'shell'
  unit: string
  activeSeconds: number
  estimateSeconds: number
  stars: number
  /** La primera vez que lo supera (no una repetición para mejorar). */
  first: boolean
  at: string
}

export function createCourseTimes(db: Db) {
  return {
    async record(time: CourseTime): Promise<void> {
      await db.execute({
        sql: `INSERT INTO course_times
                (login, course, unit, active_seconds, estimate_seconds, stars, first, at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          time.login,
          time.course,
          time.unit,
          time.activeSeconds,
          time.estimateSeconds,
          time.stars,
          time.first ? 1 : 0,
          time.at,
        ],
      })
    },
  }
}

export type CourseTimes = ReturnType<typeof createCourseTimes>
