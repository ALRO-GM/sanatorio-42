/**
 * Módulo `notices`: el buzón de avisos de cada persona, y el "pulso" que la web
 * pregunta cada poco para saber si hay algo nuevo.
 */

import type { Pulse } from '@sanatorio/contracts'

import type { EventBus } from '../../core/events.js'
import type { AppModule } from '../../core/module.js'
import type { Quota } from '../replica/index.js'
import { createNoticesService } from './notices.service.js'
import type { NoticesService, NoticesServiceOptions } from './notices.service.js'

export type NoticesModuleDeps = NoticesServiceOptions & {
  events: EventBus
  /** La cuota de 42, para contarla en el mismo pulso que los avisos sin leer. */
  quota: Quota
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

        return { unread: await service.unread(login), quota: await deps.quota.statusFor(login) }
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
    jobs: [
      {
        name: 'borrado de avisos antiguos',
        everyMs: 24 * 60 * 60_000,
        run: async () => {
          await service.purge()
        },
      },
    ],
  }
}

export type { NoticesService } from './notices.service.js'
