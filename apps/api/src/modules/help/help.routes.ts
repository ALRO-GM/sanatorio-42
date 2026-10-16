/**
 * Rutas de la ayuda reservada.
 */

import type { FastifyInstance } from 'fastify'

import { idParam } from '../../core/http/params.js'
import type { IdParams } from '../../core/http/params.js'
import type { RouteContext } from '../../core/module.js'
import type { HelpService } from './help.service.js'

export function registerHelpRoutes(
  app: FastifyInstance,
  { session }: RouteContext,
  help: HelpService,
): void {
  /** `GET /help/today` → tu guardia de hoy: franjas, tope, reservas y bloqueos. */
  app.get('/help/today', async (request, reply) => {
    return reply.send(await help.today(await session.actor(request)))
  })

  /** `PUT /help/today` → `{ windows: [{ start, end }], maxMinutes }`. */
  app.put('/help/today', async (request, reply) => {
    return reply.send(await help.setToday(await session.actor(request), request.body))
  })

  /** `GET /help/offers` → quién se ofrece hoy en el campus y aún tiene hueco. */
  app.get('/help/offers', async (request, reply) => {
    return reply.send(await help.offers(await session.actor(request)))
  })

  /** `POST /help/bookings` → `{ helper, start, minutes, projectId?, note? }`. Queda pendiente. */
  app.post('/help/bookings', async (request, reply) => {
    return reply.code(201).send(await help.book(await session.actor(request), request.body))
  })

  /** `POST /help/bookings/:id/accept` y `…/decline`. Solo quien ayuda. */
  for (const decision of ['accept', 'decline'] as const) {
    app.post<IdParams>(`/help/bookings/:id/${decision}`, async (request, reply) => {
      await help.respond(
        await session.actor(request),
        idParam(request.params.id, 'La reserva'),
        decision === 'accept',
      )

      return reply.code(204).send()
    })
  }

  /** `GET /help/inbox` → peticiones por contestar y rechazos sin ver. */
  app.get('/help/inbox', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store')

    return reply.send(await help.inbox(await session.actor(request)))
  })

  /** `POST /help/bookings/:id/seen` → ya has visto que se rechazó o anuló. 204. */
  app.post<IdParams>('/help/bookings/:id/seen', async (request, reply) => {
    await help.seen(await session.actor(request), idParam(request.params.id, 'La reserva'))

    return reply.code(204).send()
  })

  /** `DELETE /help/bookings/:id` → la anula. Cualquiera de las dos personas. */
  app.delete<IdParams>('/help/bookings/:id', async (request, reply) => {
    await help.cancel(await session.actor(request), idParam(request.params.id, 'La reserva'))

    return reply.code(204).send()
  })

  /** `POST /help/bookings/:id/rating` → `{ tag }`. Devuelve `{ xp }` (`null` si falta la otra parte). */
  app.post<IdParams>('/help/bookings/:id/rating', async (request, reply) => {
    return reply.send(
      await help.rate(
        await session.actor(request),
        idParam(request.params.id, 'La reserva'),
        request.body,
      ),
    )
  })

  /** `POST /help/blocks` → `{ login }`. */
  app.post('/help/blocks', async (request, reply) => {
    await help.block(await session.actor(request), request.body)

    return reply.code(204).send()
  })

  app.delete<{ Params: { login: string } }>('/help/blocks/:login', async (request, reply) => {
    await help.unblock(await session.actor(request), request.params.login)

    return reply.code(204).send()
  })

  /** `GET /help/reputation` → cómo te han descrito quienes te ayudaron. */
  app.get('/help/reputation', async (request, reply) => {
    return reply.send(await help.reputation(await session.actor(request)))
  })
}
