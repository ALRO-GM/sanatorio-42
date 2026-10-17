/**
 * Módulo `stats`: las estadísticas de Ayuda (sala de espera, tablón, terapia,
 * pizarras y Not-games), con la clasificación de cada sección. Solo lee.
 */

import type { Db } from '../../core/db/database.js'
import type { AppModule } from '../../core/module.js'
import { createPaceRepository, createStatsRepository } from './stats.repository.js'
import { createStatsService } from './stats.service.js'
import type { StatsService } from './stats.service.js'

export type StatsModule = AppModule & { service: StatsService }

export function createStatsModule(deps: { db: Db; now?: () => number }): StatsModule {
  const service = createStatsService({
    stats: createStatsRepository(deps.db),
    paces: createPaceRepository(deps.db),
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
    },
  }
}
