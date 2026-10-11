/**
 * Módulo `usage`: cuánto se usa cada elemento de la web, para poder ordenarlos
 * solos según lo que más usa la comunidad.
 */

import type { Db } from '../../core/db/database.js'
import type { AppModule } from '../../core/module.js'
import type { ReplicaRepository } from '../replica/index.js'
import { createUsageService } from './usage.service.js'
import type { UsageService } from './usage.service.js'

export type UsageModule = AppModule & { service: UsageService }

export function createUsageModule(deps: {
  db: Db
  replica: ReplicaRepository
  now?: () => number
}): UsageModule {
  const service = createUsageService(deps)

  return {
    name: 'usage',
    service,
    routes: (app, { session }) => {
      /** `GET /usage` → cuánto usa la comunidad cada elemento: `{ counts: { "nav.tablon": 120 } }`. */
      app.get('/usage', async (request, reply) => {
        session.user(request)
        reply.header('Cache-Control', 'private, max-age=300')

        return reply.send(await service.community())
      })

      /**
       * `GET /usage/heatmap?by=total|activity|track|cohort` → uso de cada elemento
       * por grupo de personas. Solo admins.
       */
      app.get<{ Querystring: { by?: string } }>('/usage/heatmap', async (request, reply) => {
        return reply.send(await service.heatmap(await session.actor(request), request.query))
      })

      /** `POST /usage` → suma lo que has usado desde el último envío. 204. */
      app.post('/usage', async (request, reply) => {
        await service.record(await session.actor(request), request.body)

        return reply.code(204).send()
      })
    },
  }
}

export type { UsageService } from './usage.service.js'
