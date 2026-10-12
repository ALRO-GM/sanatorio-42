/**
 * Módulo `clicker`: Code Clicker, la sección secreta de la web.
 */

import type { AppModule } from '../../core/module.js'
import { createClickerService } from './clicker.service.js'
import type { ClickerService, ClickerServiceOptions } from './clicker.service.js'

export type ClickerModule = AppModule & { service: ClickerService }

export function createClickerModule(deps: ClickerServiceOptions): ClickerModule {
  const service = createClickerService(deps)

  return {
    name: 'clicker',
    service,
    routes: (app, { session }) => {
      /** `GET /clicker` → cuánto llevas pulsado, qué pastilla elegiste y tu partida. */
      app.get('/clicker', async (request, reply) => {
        reply.header('Cache-Control', 'private, no-store')

        return reply.send(await service.state(await session.actor(request)))
      })

      /** `POST /clicker/plus` → `{ count }`: pulsaciones de la cruz desde el último envío. */
      app.post('/clicker/plus', async (request, reply) => {
        return reply.send(await service.plus(await session.actor(request), request.body))
      })

      /** `POST /clicker/pill` → `{ pill }`: la roja o la azul. Una sola vez. */
      app.post('/clicker/pill', async (request, reply) => {
        return reply.send(await service.choose(await session.actor(request), request.body))
      })

      /** `PUT /clicker/save` → guarda la partida y las cifras de la clasificación. 204. */
      app.put('/clicker/save', async (request, reply) => {
        await service.save(await session.actor(request), request.body)

        return reply.code(204).send()
      })

      /** `GET /clicker/board` → quién ha escrito más código. */
      app.get('/clicker/board', async (request, reply) => {
        reply.header('Cache-Control', 'private, no-store')

        return reply.send(await service.board(await session.actor(request)))
      })
    },
  }
}

export { clickerLevel, PLUS_GOAL } from './clicker.service.js'
export type { ClickerService } from './clicker.service.js'
