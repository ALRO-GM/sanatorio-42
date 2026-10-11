/**
 * Módulo `meet`: avisos y chat de cada evento, y asistencia validada con códigos.
 */

import type { AppModule } from '../../core/module.js'
import { createMeetService } from './meet.service.js'
import type { MeetService, MeetServiceOptions } from './meet.service.js'

export type MeetModule = AppModule & { service: MeetService }

export function createMeetModule(deps: MeetServiceOptions): MeetModule {
  const service = createMeetService(deps)

  return {
    name: 'meet',
    service,
    routes: (app, { session }) => {
      /** `GET /events/thread?id=` → el chat de un evento en el que participas. */
      app.get<{ Querystring: { id?: string } }>('/events/thread', async (request, reply) => {
        reply.header('Cache-Control', 'private, no-store')

        return reply.send(
          await service.thread(
            await session.actor(request),
            session.user(request).id,
            request.query.id,
          ),
        )
      })

      /** `POST /events/messages` → manda un aviso o un mensaje; devuelve el chat. */
      app.post('/events/messages', async (request, reply) => {
        return reply.send(
          await service.send(await session.actor(request), session.user(request).id, request.body),
        )
      })

      /** `GET /admin/messages` → los últimos mensajes de todos los chats. Solo admins. */
      app.get('/admin/messages', async (request, reply) => {
        return reply.send(await service.log(await session.actor(request)))
      })

      /** `GET /events/attendance?id=` → códigos (quien organiza) o lo validado (quien asiste). */
      app.get<{ Querystring: { id?: string } }>('/events/attendance', async (request, reply) => {
        reply.header('Cache-Control', 'private, no-store')

        return reply.send(await service.attendance(await session.actor(request), request.query.id))
      })

      /** `POST /events/checkin` → `{ id, code }`: valida el código de inicio o el de fin. */
      app.post('/events/checkin', async (request, reply) => {
        return reply.send(await service.checkin(await session.actor(request), request.body))
      })
    },
  }
}

export type { MeetService } from './meet.service.js'
