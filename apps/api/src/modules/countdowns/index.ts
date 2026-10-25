/**
 * Módulo `countdowns`: avisos con cuenta atrás (`docs/avisos-cuenta-atras.md`).
 * Los de quien administra (la limpieza de taquillas) y lo que se fija cada
 * cual de su calendario, en una ventanita flotante de la web.
 */

import { tableStore } from '../../core/db/data-store.js'
import { idParam } from '../../core/http/params.js'
import type { AppModule } from '../../core/module.js'
import { createCountdownsService } from './countdowns.service.js'
import type { CountdownsService, CountdownsServiceOptions } from './countdowns.service.js'

export type CountdownsModule = AppModule & { service: CountdownsService }

export function createCountdownsModule(deps: CountdownsServiceOptions): CountdownsModule {
  const service = createCountdownsService(deps)

  return {
    name: 'countdowns',
    personal: [
      // Quien manda un aviso se lleva lo que mandó; no quién lo ha cerrado.
      { table: 'countdown_notices', logins: ['created_by'] },
      { table: 'countdown_dismissals', logins: ['login'] },
      { table: 'countdown_pins', logins: ['login'] },
    ],
    service,
    stores: [
      tableStore(deps.db, {
        id: 'countdowns',
        table: 'countdown_notices',
        login: 'created_by',
        date: { column: 'created_at', as: 'iso' },
        show: ['id', 'created_by', 'title', 'preset', 'target_at', 'created_at'],
        children: [{ table: 'countdown_dismissals', key: 'notice_id', parent: 'id' }],
      }),
      tableStore(deps.db, {
        id: 'countdown_pins',
        table: 'countdown_pins',
        login: 'login',
        date: { column: 'created_at', as: 'iso' },
        show: ['id', 'login', 'kind', 'title', 'target_at', 'created_at'],
      }),
    ],
    routes: (app, { session }) => {
      /** `GET /countdowns` → tus cuentas atrás: avisos y lo fijado, lo más cercano primero. */
      app.get('/countdowns', async (request, reply) => {
        return reply.send(await service.list(await session.actor(request)))
      })

      /**
       * `POST /countdowns/pins` → `{ kind: 'event', eventId }`, `{ kind: 'next' }`
       * o `{ kind: 'custom', title, at }`; devuelve tus cuentas atrás.
       */
      app.post('/countdowns/pins', async (request, reply) => {
        return reply.code(201).send(await service.pin(await session.actor(request), request.body))
      })

      /** `DELETE /countdowns/pins/:id` → la quita; devuelve tus cuentas atrás. */
      app.delete<{ Params: { id: string } }>('/countdowns/pins/:id', async (request, reply) => {
        return reply.send(
          await service.unpin(
            await session.actor(request),
            idParam(request.params.id, 'La cuenta atrás'),
          ),
        )
      })

      /** `POST /countdowns/notices/:id/dismiss` → cierra un aviso; devuelve tus cuentas atrás. */
      app.post<{ Params: { id: string } }>(
        '/countdowns/notices/:id/dismiss',
        async (request, reply) => {
          return reply.send(
            await service.dismiss(
              await session.actor(request),
              idParam(request.params.id, 'El aviso'),
            ),
          )
        },
      )

      /** `GET /admin/countdowns` → los últimos avisos mandados. Solo admins. */
      app.get('/admin/countdowns', async (request, reply) => {
        return reply.send(await service.reports(await session.actor(request)))
      })

      /** `POST /admin/countdowns` → manda un aviso con cuenta atrás. Solo admins. */
      app.post('/admin/countdowns', async (request, reply) => {
        return reply.code(201).send(await service.send(await session.actor(request), request.body))
      })

      /** `DELETE /admin/countdowns/:id` → lo retira para todo el mundo. Solo admins. 204. */
      app.delete<{ Params: { id: string } }>('/admin/countdowns/:id', async (request, reply) => {
        await service.remove(await session.actor(request), idParam(request.params.id, 'El aviso'))

        return reply.code(204).send()
      })
    },
  }
}

export type { CountdownsService } from './countdowns.service.js'
