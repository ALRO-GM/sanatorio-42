/**
 * Módulo `notices`: el buzón de avisos de cada persona, y el "pulso" que la web
 * pregunta cada poco para saber si hay algo nuevo.
 */

import type { Actor } from '../../core/actor.js'
import type { Pulse } from '@sanatorio/contracts'

import type { EventBus } from '../../core/events.js'
import { tableStore } from '../../core/db/data-store.js'
import type { AppModule } from '../../core/module.js'
import type { Quota } from '../replica/index.js'
import { createNoticesService } from './notices.service.js'
import type { NoticesService, NoticesServiceOptions } from './notices.service.js'

export type NoticesModuleDeps = NoticesServiceOptions & {
  events: EventBus
  /** La cuota de 42, para contarla en el mismo pulso que los avisos sin leer. */
  quota: Quota
  /**
   * Alguien con la web abierta acaba de dar señales de vida. El pulso es lo
   * único que toda pestaña abierta pregunta de fondo, así que sirve de latido.
   */
  onPulse?: (login: string) => void
  /** Cuántos comunicados tiene esa persona por leer. */
  broadcasts?: (actor: Actor) => Promise<number>
}

export type NoticesModule = AppModule & { service: NoticesService }

export function createNoticesModule(deps: NoticesModuleDeps): NoticesModule {
  const service = createNoticesService(deps)

  deps.events.on('notice', (notice) => service.add(notice))

  return {
    name: 'notices',
    service,
    routes: (app, { session }) => {
      /**
       * `GET /pulse` → avisos sin leer y estado de la cuota de 42, en una sola
       * petición: es lo único que la web pregunta de fondo además del calendario.
       */
      app.get('/pulse', async (request, reply): Promise<Pulse> => {
        const { login } = session.user(request)

        reply.header('Cache-Control', 'private, no-store')
        deps.onPulse?.(login)

        return {
          unread: await service.unread(login),
          broadcasts: (await deps.broadcasts?.(await session.actor(request))) ?? 0,
          quota: await deps.quota.statusFor(login),
        }
      })

      /** `GET /notices` → tu buzón: lo que no has leído primero. */
      app.get('/notices', async (request, reply) => {
        reply.header('Cache-Control', 'private, no-store')

        return reply.send(await service.list(await session.actor(request)))
      })

      /** `POST /notices/read` → `{ ids? }`: da por leídos esos avisos, o todos. Devuelve el buzón. */
      app.post('/notices/read', async (request, reply) => {
        return reply.send(await service.read(await session.actor(request), request.body))
      })
    },
    stores: [
      tableStore(deps.db, {
        id: 'notices',
        table: 'notices',
        login: 'login',
        date: { column: 'updated_at', as: 'iso' },
        show: ['id', 'login', 'kind', 'ref', 'from_login', 'text', 'updated_at', 'read_at'],
      }),
    ],
  }
}

export type { NoticesService } from './notices.service.js'
