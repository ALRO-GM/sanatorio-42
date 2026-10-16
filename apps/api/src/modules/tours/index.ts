/**
 * Módulo `tours`: la velocidad de las demostraciones animadas, que se ajusta
 * sola con lo que hace la gente con su deslizador.
 */

import type { Db } from '../../core/db/database.js'
import type { AppModule } from '../../core/module.js'
import { createToursService } from './tours.service.js'
import type { ToursService } from './tours.service.js'

export type ToursModule = AppModule & { service: ToursService }

export function createToursModule(deps: { db: Db; now?: () => number }): ToursModule {
  const service = createToursService(deps)

  return {
    name: 'tours',
    personal: [{ table: 'tour_rates', logins: ['login'] }],
    service,
    routes: (app, { session }) => {
      /** `GET /tours/speeds` → a cuánto va cada demostración de fábrica. */
      app.get('/tours/speeds', async (request, reply) => {
        session.user(request)
        reply.header('Cache-Control', 'private, max-age=300')

        return reply.send(await service.speeds())
      })

      /** `POST /tours/speed` → `{ name, rate }`: a cuánto la has visto. Devuelve la de fábrica. */
      app.post('/tours/speed', async (request, reply) => {
        return reply.send(await service.rate(await session.actor(request), request.body))
      })

      /** `GET /admin/tours` → velocidad y recuento de cada demostración. Solo admins. */
      app.get('/admin/tours', async (request, reply) => {
        reply.header('Cache-Control', 'private, no-store')

        return reply.send(await service.stats(await session.actor(request)))
      })
    },
  }
}

export type { ToursService } from './tours.service.js'
