/**
 * Módulo `clicker`: Code Clicker, la sección secreta de la web.
 */

import { tableStore } from '../../core/db/data-store.js'
import type { AppModule } from '../../core/module.js'
import { createClickerService } from './clicker.service.js'
import type { ClickerService, ClickerServiceOptions } from './clicker.service.js'

export type ClickerModule = AppModule & { service: ClickerService }

export function createClickerModule(deps: ClickerServiceOptions): ClickerModule {
  const service = createClickerService(deps)

  return {
    name: 'clicker',
    personal: [
      { table: 'clicker', logins: ['login'] },
      { table: 'clicker_cheats', logins: ['login'] },
      { table: 'clicker_cheat_log', logins: ['login'] },
      { table: 'clicker_capital', logins: ['login'] },
      { table: 'clicker_alerts', logins: ['login'] },
      { table: 'clicker_clicks', logins: ['login'] },
    ],
    service,
    jobs: [
      {
        name: 'aligerado del historial de capital',
        everyMs: 60 * 60_000,
        run: () => service.compact(),
      },
    ],
    stores: [
      tableStore(deps.db, {
        id: 'clicker_capital',
        table: 'clicker_capital',
        login: 'login',
        date: { column: 'at', as: 'seconds' },
        show: ['login', 'at', 'capital'],
      }),
      tableStore(deps.db, {
        id: 'clicker_alerts',
        table: 'clicker_alerts',
        login: 'login',
        date: { column: 'at', as: 'iso' },
        show: ['id', 'login', 'at', 'seconds', 'from_capital', 'to_capital'],
      }),
      tableStore(deps.db, {
        id: 'clicker_cheats',
        table: 'clicker_cheats',
        login: 'login',
        date: { column: 'at', as: 'iso' },
        show: ['id', 'login', 'at', 'why', 'total', 'per_second'],
      }),
    ],
    routes: (app, { session }) => {
      /** `GET /clicker` → cuánto llevas pulsado, qué pastilla elegiste y tu partida. */
      app.get('/clicker', async (request, reply) => {
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

      /** `PUT /clicker/save` → guarda la partida y las cifras de la clasificación. */
      app.put('/clicker/save', async (request, reply) => {
        return reply.send(await service.save(await session.actor(request), request.body))
      })

      /** `GET /clicker/reviews` → revisiones de trampas que tienes que contestar. */
      app.get('/clicker/reviews', async (request, reply) => {
        return reply.send(await service.reviews(await session.actor(request)))
      })

      /** `POST /clicker/reviews/:id` → `{ answer }`: te defiendes o explicas cómo lo hiciste. 204. */
      app.post<{ Params: { id: string } }>('/clicker/reviews/:id', async (request, reply) => {
        await service.defend(await session.actor(request), request.params.id, request.body)

        return reply.code(204).send()
      })

      /** `POST /clicker/seizure/ack` → ya has visto el aviso de la policía del código. 204. */
      app.post('/clicker/seizure/ack', async (request, reply) => {
        await service.ackSeizure(await session.actor(request))

        return reply.code(204).send()
      })

      /** `GET /clicker/board` → quién ha escrito más código. */
      app.get('/clicker/board', async (request, reply) => {
        return reply.send(await service.board(await session.actor(request)))
      })

      /** `GET /clicker/capital?from=&to=` → tu historial de capital, para la gráfica. */
      app.get<{ Querystring: Record<string, string> }>(
        '/clicker/capital',
        async (request, reply) => {
          return reply.send(await service.capital(await session.actor(request), request.query))
        },
      )

      /** `GET /admin/clicker/capital?login=&from=&to=` → el historial de otra persona. Solo admins. */
      app.get<{ Querystring: Record<string, string> }>(
        '/admin/clicker/capital',
        async (request, reply) => {
          return reply.send(await service.capitalFor(await session.actor(request), request.query))
        },
      )

      /** `GET /admin/clicker/cheats` → el registro de trampas (`ClickerCheats`). Solo admins. */
      app.get('/admin/clicker/cheats', async (request, reply) => {
        return reply.send(await service.cheats(await session.actor(request)))
      })

      /** `POST /admin/clicker/cheats/:id/pardon` → indulta esa trampa. 204. Solo admins. */
      app.post<{ Params: { id: string } }>(
        '/admin/clicker/cheats/:id/pardon',
        async (request, reply) => {
          await service.pardon(await session.actor(request), request.params.id)

          return reply.code(204).send()
        },
      )

      /**
       * `POST /admin/clicker/alerts/:id/review` → `{ verdict }`: `cheat` aplica la
       * política de trampas, `likely` le pide que se defienda, `clean` lo cierra. 204.
       */
      app.post<{ Params: { id: string } }>(
        '/admin/clicker/alerts/:id/review',
        async (request, reply) => {
          await service.review(await session.actor(request), request.params.id, request.body)

          return reply.code(204).send()
        },
      )

      /** `DELETE /admin/clicker/alerts/:id` → descarta un aviso de salto. 204. Solo admins. */
      app.delete<{ Params: { id: string } }>(
        '/admin/clicker/alerts/:id',
        async (request, reply) => {
          await service.dismiss(await session.actor(request), request.params.id)

          return reply.code(204).send()
        },
      )

      /**
       * `POST /admin/clicker/sanction` → `{ login, code, wipe, note }`: le deja ese
       * código y, con `wipe`, sin edificios ni mejoras; lo verá en el juego. 204.
       */
      app.post('/admin/clicker/sanction', async (request, reply) => {
        await service.sanction(await session.actor(request), request.body)

        return reply.code(204).send()
      })

      /** `GET /admin/clicker/game?login=` → la partida de alguien, para verla. Solo admins. */
      app.get<{ Querystring: Record<string, string> }>(
        '/admin/clicker/game',
        async (request, reply) => {
          return reply.send(await service.gameOf(await session.actor(request), request.query))
        },
      )

      /** `GET /admin/clicker?days=` → el uso del juego, general y por persona. Solo admins. */
      app.get<{ Querystring: Record<string, string> }>('/admin/clicker', async (request, reply) => {
        return reply.send(await service.usage(await session.actor(request), request.query))
      })
    },
  }
}

export { hackerTitle } from './cheat.rules.js'
export { clickerLevel } from './clicker.service.js'
export type { ClickerService } from './clicker.service.js'
