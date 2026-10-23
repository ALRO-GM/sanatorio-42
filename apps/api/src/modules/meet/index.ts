/**
 * Módulo `meet`: avisos y chat de cada evento, y asistencia validada con códigos.
 */

import { tableStore } from '../../core/db/data-store.js'
import type { AppModule } from '../../core/module.js'
import { createMeetService } from './meet.service.js'
import type { MeetService, MeetServiceOptions } from './meet.service.js'

export type MeetModule = AppModule & { service: MeetService }

export function createMeetModule(deps: MeetServiceOptions): MeetModule {
  const service = createMeetService(deps)

  return {
    name: 'meet',
    personal: [
      { table: 'event_messages', logins: ['login'] },
      { table: 'conversation_marks', logins: ['login'] },
      { table: 'event_alerts', logins: ['login'] },
    ],
    service,
    routes: (app, { session }) => {
      /** `GET /events/thread?id=&after=` → el chat de un evento en el que participas. */
      app.get<{ Querystring: { id?: string; after?: string } }>(
        '/events/thread',
        async (request, reply) => {
          return reply.send(
            await service.thread(
              await session.actor(request),
              session.user(request).id,
              request.query.id,
              request.query.after,
            ),
          )
        },
      )

      /** `POST /events/messages` → manda un aviso o un mensaje; devuelve el chat. */
      app.post('/events/messages', async (request, reply) => {
        return reply.send(
          await service.send(await session.actor(request), session.user(request).id, request.body),
        )
      })

      /** `GET /events/alerts` → tus avisos de evento, por orden de inicio. */
      /** `GET /conversations` → todas tus conversaciones, con lo que has apuntado de cada una. */
      app.get('/conversations', async (request, reply) => {
        return reply.send(await service.conversations(await session.actor(request)))
      })

      /** `PUT /conversations/mark` → `{ id, read?, pending?, remindAt?, projectId? }`. Devuelve la lista. */
      app.put('/conversations/mark', async (request, reply) => {
        return reply.send(
          await service.markConversation(
            await session.actor(request),
            session.user(request).id,
            request.body,
          ),
        )
      })

      app.get('/events/alerts', async (request, reply) => {
        return reply.send(
          await service.alerts(await session.actor(request), session.user(request).id),
        )
      })

      /** `POST /events/alerts/ack` → `{ id }`: cierra el aviso de un evento que se te pasó. 204. */
      app.post<{ Body?: { id?: unknown } }>('/events/alerts/ack', async (request, reply) => {
        // Sin cuerpo no hay `id`: que lo rechace la validación, no un error interno.
        await service.ackAlert(await session.actor(request), request.body?.id)

        return reply.code(204).send()
      })

      /** `GET /admin/messages` → los últimos mensajes de todos los chats. Solo admins. */
      app.get('/admin/messages', async (request, reply) => {
        return reply.send(await service.log(await session.actor(request)))
      })

      /** `GET /events/attendance?id=` → códigos (quien organiza) o lo validado (quien asiste). */
      app.get<{ Querystring: { id?: string } }>('/events/attendance', async (request, reply) => {
        return reply.send(await service.attendance(await session.actor(request), request.query.id))
      })

      /** `POST /events/checkin` → `{ id, code }`: valida el código de inicio o el de fin. */
      app.post('/events/checkin', async (request, reply) => {
        return reply.send(await service.checkin(await session.actor(request), request.body))
      })

      /**
       * `GET /events/report?from=&to=&login=&format=` → las horas validadas con
       * códigos. Con `format=csv`, como fichero para una hoja de cálculo.
       */
      app.get<{ Querystring: { format?: string } }>('/events/report', async (request, reply) => {
        const { format, ...query } = request.query
        const actor = await session.actor(request)

        if (format !== 'csv') {
          return reply.send(await service.report(actor, query))
        }

        const issued = await service.reportCsv(actor, query)

        return reply
          .header('Content-Type', 'text/csv; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="${issued.fileName}"`)
          .header('X-Verification-Code', issued.code)
          .send(issued.csv)
      })

      /** `GET /admin/checkins?id=` → cada intento de validar un código de un evento. Solo admins. */
      app.get<{ Querystring: { id?: string } }>('/admin/checkins', async (request, reply) => {
        return reply.send(await service.checkins(await session.actor(request), request.query.id))
      })
    },
    jobs: [
      {
        name: 'recordatorios de conversaciones',
        everyMs: 60_000,
        run: async () => {
          await service.remind()
        },
      },
    ],
    stores: [
      tableStore(deps.db, {
        id: 'messages',
        table: 'event_messages',
        login: 'login',
        date: { column: 'created_at', as: 'iso' },
        show: ['id', 'event_id', 'login', 'kind', 'body', 'created_at'],
      }),
      tableStore(deps.db, {
        id: 'conversation_marks',
        table: 'conversation_marks',
        login: 'login',
        date: { column: 'updated_at', as: 'iso' },
        show: ['login', 'chat_id', 'read_upto', 'pending', 'remind_at', 'project_id', 'updated_at'],
      }),
      tableStore(deps.db, {
        id: 'event_alerts',
        table: 'event_alerts',
        login: 'login',
        date: { column: 'missed_at', as: 'iso' },
        show: ['event_id', 'login', 'event', 'starts_at', 'missed_at', 'acked_at'],
      }),
    ],
  }
}

export type { MeetService } from './meet.service.js'
