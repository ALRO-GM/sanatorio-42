/**
 * Módulo `focus`: el modo Pomodoro (#65 del buzón).
 */

import type { Db } from '../../core/db/database.js'
import type { AppModule } from '../../core/module.js'
import { createFocusRepository, createFocusService } from './focus.service.js'
import type { FocusRepository, FocusService } from './focus.service.js'

export type FocusModule = AppModule & { service: FocusService; repository: FocusRepository }

export function createFocusModule(deps: { db: Db; now?: () => number }): FocusModule {
  const repository = createFocusRepository(deps.db)
  const service = createFocusService(repository, deps.now)

  return {
    name: 'focus',
    personal: [{ table: 'focus', logins: ['login'] }],
    service,
    repository,
    routes: (app, { session }) => {
      /** `GET /me/focus` → si estás concentrado, hasta cuándo, y tus ajustes. */
      app.get('/me/focus', async (request, reply) => {
        reply.header('Cache-Control', 'private, no-store')

        return reply.send(await service.view(await session.actor(request)))
      })

      /** `PUT /me/focus` → `FocusSettings`: empieza a concentrarte. */
      app.put('/me/focus', async (request, reply) => {
        return reply.send(await service.start(await session.actor(request), request.body))
      })

      /** `DELETE /me/focus` → acaba la concentración antes de tiempo. */
      app.delete('/me/focus', async (request, reply) => {
        return reply.send(await service.stop(await session.actor(request)))
      })
    },
  }
}

export type { FocusRepository } from './focus.service.js'
