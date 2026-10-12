/**
 * Módulo `usage`: cuánto se usa cada elemento de la web, para poder ordenarlos
 * solos según lo que más usa la comunidad.
 */

import type { Db } from '../../core/db/database.js'
import { tableStore } from '../../core/db/data-store.js'
import type { AppModule } from '../../core/module.js'
import type { ReplicaRepository } from '../replica/index.js'
import { createUsageService } from './usage.service.js'
import type { Online, Traffic } from './usage.service.js'
import type { UsageService } from './usage.service.js'

export type UsageModule = AppModule & { service: UsageService }

export function createUsageModule(deps: {
  db: Db
  replica: ReplicaRepository
  traffic?: Traffic
  online?: Online
  now?: () => number
}): UsageModule {
  const service = createUsageService(deps)

  return {
    name: 'usage',
    service,
    stores: [
      tableStore(deps.db, {
        id: 'usage',
        table: 'usage_time',
        login: 'login',
        date: { column: 'day', as: 'day' },
        show: ['login', 'day', 'hour', 'key', 'clicks', 'seen_s', 'back_s', 'hidden_s'],
      }),
      tableStore(deps.db, {
        id: 'flows',
        table: 'usage_flows',
        login: 'login',
        date: { column: 'day', as: 'day' },
        show: ['login', 'day', 'from_key', 'to_key', 'count'],
      }),
    ],
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

      /**
       * `GET /admin/stats?from=&to=&login=` → uso por hora, por elemento y por
       * persona, con el tráfico de la API. Solo admins.
       */
      app.get<{ Querystring: Record<string, string> }>('/admin/stats', async (request, reply) => {
        reply.header('Cache-Control', 'private, no-store')

        return reply.send(await service.stats(await session.actor(request), request.query))
      })

      /** `GET /admin/flows?from=&to=&login=` → cómo se navega entre secciones. Solo admins. */
      app.get<{ Querystring: Record<string, string> }>('/admin/flows', async (request, reply) => {
        reply.header('Cache-Control', 'private, no-store')

        return reply.send(await service.flows(await session.actor(request), request.query))
      })

      /** `GET /admin/online` → quién tiene la web abierta y cuánto lleva. Solo admins. */
      app.get('/admin/online', async (request, reply) => {
        reply.header('Cache-Control', 'private, no-store')

        return reply.send(await service.online(await session.actor(request)))
      })

      /** `POST /usage` → suma lo que has usado desde el último envío. 204. */
      app.post('/usage', async (request, reply) => {
        await service.record(await session.actor(request), request.body)

        return reply.code(204).send()
      })
    },
  }
}

export type { SectionTime, Traffic, UsageService } from './usage.service.js'
