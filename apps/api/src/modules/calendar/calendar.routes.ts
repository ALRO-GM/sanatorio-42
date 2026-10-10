/**
 * Rutas del calendario personal.
 */

import type { FastifyInstance } from 'fastify'

import type { RouteContext } from '../../core/module.js'
import type { CalendarService } from './calendar.service.js'

export function registerCalendarRoutes(
  app: FastifyInstance,
  { session }: RouteContext,
  calendar: CalendarService,
): void {
  /**
   * `GET /calendar?from=&to=` → tus eventos entre dos instantes (ISO-8601): los
   * de Sanatorio y los de 42. Como mucho, 62 días de una vez.
   */
  app.get<{ Querystring: { from?: string; to?: string } }>('/calendar', async (request, reply) => {
    const actor = await session.actor(request)

    reply.header('Cache-Control', 'private, no-store')

    return reply.send(
      await calendar.between(actor, session.user(request).id, request.query.from, request.query.to),
    )
  })
}
