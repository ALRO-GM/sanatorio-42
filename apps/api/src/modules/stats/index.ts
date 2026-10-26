/**
 * Módulo `stats`: las estadísticas de Ayuda (sala de espera, tablón, terapia,
 * pizarras y Not-games), con la clasificación de cada sección, y el Avance de
 * Datos (la gráfica y quién va más rápido). Solo lee.
 */

import type { FastifyRequest } from 'fastify'
import { z } from 'zod'

import { NO_POOL, seesFor, visibleTo } from '../../core/audience.js'
import type { Audience } from '../../core/audience.js'
import type { Db } from '../../core/db/database.js'
import type { AppModule } from '../../core/module.js'
import { MAX_OTHERS, createProgressService } from './progress.service.js'
import { createProgressRepository, createStatsRepository } from './stats.repository.js'
import { createStatsService } from './stats.service.js'
import type { StatsService } from './stats.service.js'
import { given } from '../../core/options.js'
import { parse } from '../../core/validation.js'

/** Los filtros de `GET /stats/ranking`. */
const rankingQuery = z
  .object({
    by: z.enum(['circle', 'circles', 'hours']).default('circle'),
    plan: z.enum(['all', 'classic', 'next']).default('all'),
    kickoff: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .optional(),
    cohort: z.enum(['only', 'since']).default('only'),
    circleMin: z.coerce.number().int().min(0).max(7).default(0),
    circleMax: z.coerce.number().int().min(0).max(7).default(7),
    pctMin: z.coerce.number().min(0).max(100).default(0),
    pctMax: z.coerce.number().min(0).max(100).default(100),
    offset: z.coerce.number().int().min(0).max(100_000).default(0),
    limit: z.coerce.number().int().min(1).max(50).default(50),
  })
  .refine((query) => query.circleMin <= query.circleMax && query.pctMin <= query.pctMax, {
    message: 'el mínimo no puede pasar del máximo',
  })

/**
 * `GET /stats/progress?with=a,b&campuses=22,1`: los logins con quien compararse,
 * separados por comas. Lo que no parece un login se ignora (como antes con uno
 * solo) y se queda en los `MAX_OTHERS` primeros. `campuses`: los ids de los
 * campus de los que se quieren las medias, o `all`; sin decirlo, el tuyo. Lo
 * que no es un número se ignora (y el servicio, lo que no se puede pedir).
 */
const progressQuery = z.object({
  campuses: z
    .string()
    .max(200)
    .optional()
    .transform((value): number[] | 'all' | undefined =>
      value === undefined
        ? undefined
        : value === 'all'
          ? 'all'
          : value
              .split(',')
              .filter((id) => /^\d{1,9}$/.test(id.trim()))
              .map(Number),
    ),
  with: z
    .string()
    .max(1000)
    .optional()
    .transform((value) =>
      [
        ...new Set(
          (value ?? '')
            .split(',')
            .map((login) => login.trim().toLowerCase())
            .filter((login) => /^[a-z0-9-]{1,32}$/.test(login)),
        ),
      ].slice(0, MAX_OTHERS),
    ),
})

export type StatsModule = AppModule & { service: StatsService }

export function createStatsModule(deps: {
  db: Db
  /** Quién ve a quién: estudiantes y piscineros separados (`docs/piscineros.md`). */
  audience?: Audience
  /** El círculo de cada proyecto de un plan (el plan de estudios), para el avance. */
  circles?: (track: 'classic' | 'next') => Promise<Map<number, number>>
  /** Los campus que sigue la web: los que se pueden pedir en el Avance, además del tuyo. */
  campusIds?: readonly number[]
  now?: () => number
}): StatsModule {
  const service = createStatsService({
    stats: createStatsRepository(deps.db),
    ...given({ now: deps.now }),
  })

  const progress = createProgressService({
    progress: createProgressRepository(deps.db),
    circles: deps.circles ?? (() => Promise.resolve(new Map<number, number>())),
    ...given({ campusIds: deps.campusIds, now: deps.now }),
  })

  return {
    name: 'stats',
    service,
    routes: (app, { session }) => {
      // En el Avance, «tu campus» es el de tu 42cursus, no el que miras en la web
      // (`Actor.campusId`, el de tus preferencias): si no, quien eligió París para
      // mirar veía París en su Avance.
      const homeOf = (request: FastifyRequest): number => session.homeCampus(session.user(request))

      /** `GET /stats?period=month|all` → cifras y clasificaciones de Ayuda del campus. */
      app.get<{ Querystring: { period?: string } }>('/stats', async (request, reply) => {
        reply.header('Cache-Control', 'private, max-age=60')

        const actor = await session.actor(request)
        const stats = await service.help(actor, request.query.period === 'all' ? 'all' : 'month')
        const audience = deps.audience ?? NO_POOL

        // En las clasificaciones, solo gente del mundo de quien mira.
        return reply.send({
          ...stats,
          sections: await Promise.all(
            stats.sections.map(async (section) => ({
              ...section,
              ranking: await visibleTo(audience, actor, section.ranking, (entry) => entry.login),
            })),
          ),
        })
      })

      /**
       * `GET /stats/ranking?by=&plan=&kickoff=&cohort=&circleMin=&circleMax=&pctMin=&pctMax=&offset=&limit=`
       * → quién va más rápido en tu campus, por páginas, con el puesto de quien mira.
       */
      app.get('/stats/ranking', async (request, reply) => {
        reply.header('Cache-Control', 'private, max-age=60')

        const query = parse(rankingQuery, request.query)
        const actor = await session.actor(request)
        // Mundos separados y personas ocultas: quien no se ve, no ocupa puesto.
        const sees = await seesFor(deps.audience ?? NO_POOL, actor)

        return reply.send(
          await progress.ranking(
            actor,
            {
              by: query.by,
              plan: query.plan,
              kickoff: query.kickoff ?? null,
              cohort: query.cohort,
              circleMin: query.circleMin,
              circleMax: query.circleMax,
              pctMin: query.pctMin,
              pctMax: query.pctMax,
            },
            { offset: query.offset, limit: query.limit },
            sees,
            homeOf(request),
          ),
        )
      })

      /**
       * `GET /stats/progress?with=login,login&campuses=22,1` → el avance a lo largo
       * del tiempo, con las medias de cada campus pedido y de todos juntos, los
       * paces y hasta cinco personas con quien compararse.
       */
      app.get('/stats/progress', async (request, reply) => {
        reply.header('Cache-Control', 'private, max-age=300')

        const query = parse(progressQuery, request.query)
        const actor = await session.actor(request)
        // Con alguien del otro mundo o oculto no se compara: como si no existiera.
        const sees = await seesFor(deps.audience ?? NO_POOL, actor)

        return reply.send(
          await progress.progress(actor, query.with, sees, {
            home: homeOf(request),
            ...given({ campuses: query.campuses }),
          }),
        )
      })

      /**
       * `GET /stats/progress/fastest` → quien terminó el common core más deprisa,
       * por plan: en tu campus y el primero de cada campus.
       */
      app.get('/stats/progress/fastest', async (request, reply) => {
        reply.header('Cache-Control', 'private, max-age=300')

        const actor = await session.actor(request)
        const sees = await seesFor(deps.audience ?? NO_POOL, actor)

        return reply.send(await progress.fastest(actor, sees, homeOf(request)))
      })
    },
  }
}
