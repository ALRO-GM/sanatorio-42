/**
 * Módulo `courses`: la parte de juego de los cuatro cursos
 * (`docs/cursos-logros.md`). Clasificaciones por campus en Clasificaciones y
 * logros que se lucen como título. No tiene tablas: lee las de cada curso
 * (`shell_progress`, `git_progress`, `docker_progress`, `k8s_progress`,
 * `rag_progress`), solo
 * para leer, como las estadísticas de Ayuda leen las de cada sección.
 */

import type { CourseId, CourseRanking, LeaderboardPeriod } from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import { NO_POOL, seesFor } from '../../core/audience.js'
import type { Audience } from '../../core/audience.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText, toTextOrNull } from '../../core/db/rows.js'
import { listArg } from '../../core/db/sql.js'
import type { AppModule } from '../../core/module.js'
import { given } from '../../core/options.js'
import { isoAt } from '../../core/time.js'
import { parse } from '../../core/validation.js'
import { COURSES, courseAchievements, courseBoards } from './courses.rules.js'
import type { CourseAchievement, CoursesProgress, CourseTally, Done } from './courses.rules.js'

/** La tabla de cada curso y cómo se llama en ella el punto del camino. */
const TABLES: Record<CourseId, { table: string; column: 'unit' | 'level' }> = {
  shell: { table: 'shell_progress', column: 'unit' },
  git: { table: 'git_progress', column: 'level' },
  docker: { table: 'docker_progress', column: 'unit' },
  k8s: { table: 'k8s_progress', column: 'unit' },
  net: { table: 'net_progress', column: 'unit' },
  rag: { table: 'rag_progress', column: 'unit' },
}

const periodQuery = z.object({ period: z.enum(['month', 'all']).default('month') })

export function createCoursesRepository(db: Db) {
  return {
    /** Lo que alguien ha superado en todos los cursos, de una vez. */
    async progressOf(login: string): Promise<CoursesProgress> {
      const result = await db.execute({
        sql: COURSES.map(
          (spec) =>
            `SELECT '${spec.id}' AS course, ${TABLES[spec.id].column} AS id, stars, done_at
             FROM ${TABLES[spec.id].table} WHERE login = ?`,
        ).join(' UNION ALL '),
        args: COURSES.map(() => login),
      })
      const progress = Object.fromEntries(
        COURSES.map((spec) => [spec.id, new Map<string, Done>()]),
      ) as Record<CourseId, Map<string, Done>>

      for (const row of result.rows) {
        progress[toText(row.course) as CourseId].set(toText(row.id), {
          stars: toNumber(row.stars),
          at: toText(row.done_at),
        })
      }

      return progress
    },

    /**
     * Lo hecho en cada curso por la gente del campus desde `since` (`null`:
     * desde siempre), sumado por persona: una fila por persona y curso.
     */
    async tallies(campusId: number, since: string | null): Promise<CourseTally[]> {
      const perCourse = await Promise.all(
        COURSES.map(async (spec) => {
          const { table, column } = TABLES[spec.id]
          const result = await db.execute({
            sql: `SELECT p.login, u.image, SUM(p.stars) AS points, COUNT(*) AS units,
                         SUM(CASE WHEN p.${column} IN (SELECT value FROM json_each(?)) THEN 1 ELSE 0 END) AS bosses,
                         SUM(CASE WHEN p.${column} IN (SELECT value FROM json_each(?)) THEN 1 ELSE 0 END) AS certificates,
                         SUM(CASE WHEN p.${column} = ? THEN 1 ELSE 0 END) AS finished
                  FROM ${table} p
                  JOIN users u ON u.login = p.login
                  JOIN campus_members m ON m.user_id = u.id AND m.campus_id = ?
                  WHERE (? IS NULL OR p.done_at >= ?)
                  GROUP BY p.login`,
            args: [
              listArg(spec.bosses),
              listArg(spec.certificates),
              spec.last,
              campusId,
              since,
              since,
            ],
          })

          return result.rows.map((row): CourseTally => ({
            login: toText(row.login),
            image: toTextOrNull(row.image),
            course: spec.id,
            points: toNumber(row.points),
            units: toNumber(row.units),
            bosses: toNumber(row.bosses),
            certificates: toNumber(row.certificates),
            finished: toNumber(row.finished),
          }))
        }),
      )

      return perCourse.flat()
    },
  }
}

type CoursesRepository = ReturnType<typeof createCoursesRepository>

export function createCoursesService(deps: {
  repository: CoursesRepository
  audience?: Audience
  now?: () => number
}) {
  const now = deps.now ?? Date.now

  return {
    /** Los logros de los cursos de alguien (y con ellos, sus títulos). */
    async achievements(login: string): Promise<CourseAchievement[]> {
      return courseAchievements(await deps.repository.progressOf(login))
    },

    /**
     * Las clasificaciones de los cursos del campus que mira `actor`, del mes o
     * de siempre. Como las de Ayuda: quien no se ve no ocupa puesto.
     */
    async ranking(actor: Actor, period: LeaderboardPeriod): Promise<CourseRanking> {
      const date = new Date(now())
      const since =
        period === 'month' ? isoAt(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)) : null
      const [tallies, sees] = await Promise.all([
        deps.repository.tallies(actor.campusId, since),
        seesFor(deps.audience ?? NO_POOL, actor),
      ])

      return { period, boards: courseBoards(tallies, actor.login, sees) }
    },
  }
}

export type CoursesService = ReturnType<typeof createCoursesService>

export type CoursesModule = AppModule & { service: CoursesService }

export function createCoursesModule(deps: {
  db: Db
  audience?: Audience
  now?: () => number
}): CoursesModule {
  const service = createCoursesService({
    repository: createCoursesRepository(deps.db),
    ...given({ audience: deps.audience, now: deps.now }),
  })

  return {
    name: 'courses',
    service,
    routes: (app, { session }) => {
      /** `GET /courses/ranking?period=month|all` → `CourseRanking`: las clasificaciones de los cursos del campus. */
      app.get('/courses/ranking', async (request, reply) => {
        reply.header('Cache-Control', 'private, max-age=60')

        const { period } = parse(periodQuery, request.query)

        return reply.send(await service.ranking(await session.actor(request), period))
      })
    },
  }
}
