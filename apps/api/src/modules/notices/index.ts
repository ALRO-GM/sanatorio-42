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

type NoticesModuleDeps = NoticesServiceOptions & {
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
  /** Cuántas revisiones de trampas de Code Clicker tiene esa persona por contestar. */
  clickerReviews?: (actor: Actor) => Promise<number>
  /** Peticiones de ayuda por contestar y rechazos sin ver. */
  help?: (actor: Actor) => Promise<number>
  /** Si hay un examen en marcha en su campus. */
  examLive?: (actor: Actor) => Promise<boolean>
}

export type NoticesModule = AppModule & { service: NoticesService }

export function createNoticesModule(deps: NoticesModuleDeps): NoticesModule {
  const service = createNoticesService(deps)

  deps.events.on('notice', (notice) => service.add(notice))
  deps.events.on('notice.settled', (about) => service.settle(about.kind, about.ref))

  return {
    name: 'notices',
    personal: [
      // El aviso es de quien lo recibe; quien lo provocó se lleva que lo
      // provocó, no el texto que leyó la otra persona.
      {
        table: 'notices',
        logins: ['login', 'from_login'],
        give: { from_login: ['id', 'kind', 'from_login', 'created_at'] },
      },
    ],
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
          clickerReviews: (await deps.clickerReviews?.(await session.actor(request))) ?? 0,
          help: (await deps.help?.(await session.actor(request))) ?? 0,
          examLive:
            (await deps.examLive?.(await session.actor(request)).catch(() => false)) ?? false,
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

      /**
       * `POST /notices/remove` → `{ ids }` o `{ read: true }`: borra esos avisos, o
       * todos los leídos sin guardar. Devuelve el buzón.
       */
      app.post('/notices/remove', async (request, reply) => {
        return reply.send(await service.remove(await session.actor(request), request.body))
      })

      /** `POST /notices/save` → `{ id, saved }`: guarda o deja de guardar un aviso. Devuelve el buzón. */
      app.post('/notices/save', async (request, reply) => {
        return reply.send(await service.save(await session.actor(request), request.body))
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
