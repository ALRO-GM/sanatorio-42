/**
 * Módulo `broadcasts`: comunicados de quien administra, que salen en pantalla
 * a quien le toquen, con opciones entre las que elegir si hace falta.
 */

import { tableStore } from '../../core/db/data-store.js'
import type { AppModule } from '../../core/module.js'
import { createBroadcastsService } from './broadcasts.service.js'
import type { BroadcastsService, BroadcastsServiceOptions } from './broadcasts.service.js'

export type BroadcastsModule = AppModule & { service: BroadcastsService }

export function createBroadcastsModule(deps: BroadcastsServiceOptions): BroadcastsModule {
  const service = createBroadcastsService(deps)

  return {
    name: 'broadcasts',
    service,
    stores: [
      tableStore(deps.db, {
        id: 'broadcasts',
        table: 'broadcasts',
        login: 'from_login',
        date: { column: 'created_at', as: 'iso' },
        children: [{ table: 'broadcast_answers', key: 'broadcast_id', parent: 'id' }],
      }),
    ],
    routes: (app, { session }) => {
      /** `GET /broadcasts` → los comunicados que tienes por leer, el más antiguo primero. */
      app.get('/broadcasts', async (request, reply) => {
        reply.header('Cache-Control', 'private, no-store')

        return reply.send(await service.pending(await session.actor(request)))
      })

      /** `POST /broadcasts/:id/answer` → `{ option }`; devuelve los que te quedan por leer. */
      app.post<{ Params: { id: string } }>('/broadcasts/:id/answer', async (request, reply) => {
        return reply.send(
          await service.answer(
            await session.actor(request),
            Number(request.params.id),
            request.body,
          ),
        )
      })

      /** `GET /admin/broadcasts` → los últimos comunicados y lo contestado. Solo admins. */
      app.get('/admin/broadcasts', async (request, reply) => {
        reply.header('Cache-Control', 'private, no-store')

        return reply.send(await service.reports(await session.actor(request)))
      })

      /** `POST /admin/broadcasts` → manda un comunicado. Solo admins. */
      app.post('/admin/broadcasts', async (request, reply) => {
        return reply.code(201).send(await service.send(await session.actor(request), request.body))
      })

      /** `DELETE /admin/broadcasts/:id` → lo retira. Solo admins. 204. */
      app.delete<{ Params: { id: string } }>('/admin/broadcasts/:id', async (request, reply) => {
        await service.remove(await session.actor(request), Number(request.params.id))

        return reply.code(204).send()
      })
    },
  }
}

export type { BroadcastsService } from './broadcasts.service.js'
