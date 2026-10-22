/**
 * Módulo `stats`: las estadísticas de Ayuda (sala de espera, tablón, terapia,
 * pizarras y Not-games), con la clasificación de cada sección. Solo lee.
 */

import type { Db } from '../../core/db/database.js'
import type { AppModule } from '../../core/module.js'
import { createProgressService } from './progress.service.js'
import {
  createPaceRepository,
  createProgressRepository,
  createStatsRepository,
} from './stats.repository.js'
import { createStatsService } from './stats.service.js'
import type { StatsService } from './stats.service.js'

export type StatsModule = AppModule & { service: StatsService }

export function createStatsModule(deps: {
  db: Db
  /** El círculo de cada proyecto de un plan (el plan de estudios), para el avance. */
  circles?: (track: 'classic' | 'next') => Promise<Map<number, number>>
  now?: () => number
}): StatsModule {
  const service = createStatsService({
    stats: createStatsRepository(deps.db),
    paces: createPaceRepository(deps.db),
    ...(deps.now === undefined ? {} : { now: deps.now }),
  })

  const progress = createProgressService({
    progress: createProgressRepository(deps.db),
    circles: deps.circles ?? (() => Promise.resolve(new Map<number, number>())),
    ...(deps.now === undefined ? {} : { now: deps.now }),
  })

  return {
    name: 'stats',
    service,
    routes: (app, { session }) => {
      /** `GET /stats?period=month|all` → cifras y clasificaciones de Ayuda del campus. */
      app.get<{ Querystring: { period?: string } }>('/stats', async (request, reply) => {
        reply.header('Cache-Control', 'private, max-age=60')

        return reply.send(
          await service.help(
            await session.actor(request),
            request.query.period === 'all' ? 'all' : 'month',
          ),
        )
      })

      /** `GET /stats/progress?with=login` → el avance a lo largo del tiempo, con medias y paces. */
      app.get<{ Querystring: { with?: string } }>('/stats/progress', async (request, reply) => {
        reply.header('Cache-Control', 'private, max-age=300')

        const other = request.query.with?.trim().toLowerCase() ?? ''

        return reply.send(
          await progress.progress(
            await session.actor(request),
            /^[a-z0-9-]{1,32}$/.test(other) ? other : null,
          ),
        )
      })
    },
  }
}
