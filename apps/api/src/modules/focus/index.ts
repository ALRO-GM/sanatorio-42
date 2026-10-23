/**
 * Módulo `focus`: el modo Pomodoro (#65 del buzón), con el registro de sesiones
 * y sus estadísticas (#80).
 */

import type { Db } from '../../core/db/database.js'
import { tableStore } from '../../core/db/data-store.js'
import type { AppModule } from '../../core/module.js'
import { createFocusRepository, createFocusService } from './focus.service.js'
import type { FocusRepository, FocusService } from './focus.service.js'
import { createSessionLog } from './focus.sessions.js'

export type FocusModule = AppModule & { service: FocusService; repository: FocusRepository }

export function createFocusModule(deps: { db: Db; now?: () => number }): FocusModule {
  const repository = createFocusRepository(deps.db)
  const service = createFocusService(repository, createSessionLog(deps.db), deps.now)

  return {
    name: 'focus',
    personal: [
      { table: 'focus', logins: ['login'] },
      { table: 'focus_sessions', logins: ['login'] },
    ],
    stores: [
      tableStore(deps.db, {
        id: 'focus_sessions',
        table: 'focus_sessions',
        login: 'login',
        date: { column: 'started_at', as: 'iso' },
        show: ['login', 'started_at', 'planned_s', 'outcome', 'reasons', 'stays'],
      }),
    ],
    service,
    repository,
    routes: (app, { session }) => {
      /** `GET /me/focus` → si estás concentrado, hasta cuándo, y tus ajustes. */
      app.get('/me/focus', async (request, reply) => {
        return reply.send(await service.view(await session.actor(request)))
      })

      /** `PUT /me/focus` → `FocusSettings`: empieza a concentrarte. */
      app.put('/me/focus', async (request, reply) => {
        return reply.send(await service.start(await session.actor(request), request.body))
      })

      /** `DELETE /me/focus` → `FocusExit` (opcional): acaba antes de tiempo, con sus motivos. */
      app.delete('/me/focus', async (request, reply) => {
        return reply.send(await service.stop(await session.actor(request), request.body))
      })

      /** `POST /me/focus/stay` → `FocusExit`: querías acabar y sigues. */
      app.post('/me/focus/stay', async (request, reply) => {
        return reply.send(await service.stay(await session.actor(request), request.body))
      })

      /** `GET /me/focus/stats?from=&to=&offset=&low=&high=` → `MyFocusStats`. */
      app.get('/me/focus/stats', async (request, reply) => {
        return reply.send(await service.myStats(await session.actor(request), request.query))
      })

      /** `GET /admin/focus/stats?from=&to=&offset=&low=&high=` → `FocusStats`. Solo admins. */
      app.get('/admin/focus/stats', async (request, reply) => {
        return reply.send(await service.adminStats(await session.actor(request), request.query))
      })
    },
  }
}

export type { FocusRepository } from './focus.service.js'
