/**
 * Módulo `stats`: las estadísticas de Ayuda (sala de espera, tablón, terapia,
 * pizarras y Not-games), con la clasificación de cada sección. Solo lee.
 */

import { NO_POOL, seesFor, visibleTo } from '../../core/audience.js'
import type { Audience } from '../../core/audience.js'
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
import { given } from '../../core/options.js'

export type StatsModule = AppModule & { service: StatsService }

export function createStatsModule(deps: {
  db: Db
  /** Quién ve a quién: estudiantes y piscineros separados (`docs/piscineros.md`). */
  audience?: Audience
  /** El círculo de cada proyecto de un plan (el plan de estudios), para el avance. */
  circles?: (track: 'classic' | 'next') => Promise<Map<number, number>>
  now?: () => number
}): StatsModule {
  const service = createStatsService({
    stats: createStatsRepository(deps.db),
    paces: createPaceRepository(deps.db),
    ...given({ now: deps.now }),
  })

  const progress = createProgressService({
    progress: createProgressRepository(deps.db),
    circles: deps.circles ?? (() => Promise.resolve(new Map<number, number>())),
    ...given({ now: deps.now }),
  })

  return {
    name: 'stats',
    service,
    routes: (app, { session }) => {
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

      /** `GET /stats/progress?with=login` → el avance a lo largo del tiempo, con medias y paces. */
      app.get<{ Querystring: { with?: string } }>('/stats/progress', async (request, reply) => {
        reply.header('Cache-Control', 'private, max-age=300')

        const other = request.query.with?.trim().toLowerCase() ?? ''
        const actor = await session.actor(request)
        // Con alguien del otro mundo no se compara: como si no existiera.
        const sees = await seesFor(deps.audience ?? NO_POOL, actor)

        return reply.send(
          await progress.progress(
            actor,
            /^[a-z0-9-]{1,32}$/.test(other) && sees(other) ? other : null,
          ),
        )
      })
    },
  }
}
