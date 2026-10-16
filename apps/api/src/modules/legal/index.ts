/**
 * Módulo `legal`: privacidad y condiciones (versión y aceptación) y la
 * descarga de los datos de cada persona.
 */

import type { AppModule } from '../../core/module.js'
import { createLegalService } from './legal.service.js'
import type { LegalService, LegalServiceOptions } from './legal.service.js'

export type LegalModule = AppModule & { service: LegalService }

export function createLegalModule(deps: LegalServiceOptions): LegalModule {
  const service = createLegalService(deps)

  return {
    name: 'legal',
    personal: [{ table: 'legal_acceptances', logins: ['login'] }],
    service,
    routes: (app, { session }) => {
      /** `GET /me/legal` → `{ version, acceptedAt }`. */
      app.get('/me/legal', async (request, reply) => {
        return reply.send(await service.status(await session.actor(request)))
      })

      /** `POST /me/legal/accept` → `{ version }`: acepta la versión vigente. */
      app.post('/me/legal/accept', async (request, reply) => {
        return reply.send(await service.accept(await session.actor(request), request.body))
      })

      /** `GET /me/export` → todo lo tuyo, en un JSON para descargar. */
      app.get('/me/export', async (request, reply) => {
        const actor = await session.actor(request)
        const data = await service.export(actor, session.user(request).id)

        reply.header(
          'Content-Disposition',
          `attachment; filename="sanatorio42-${actor.login}-${data.exportedAt.slice(0, 10)}.json"`,
        )

        return reply.send(data)
      })
    },
  }
}

export { LEGAL_VERSION } from './legal.service.js'
export type { LegalService } from './legal.service.js'
