/**
 * Rutas del calendario personal.
 */

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { parse } from '../../core/validation.js'

import type { RouteContext } from '../../core/module.js'
import type { CalendarService } from './calendar.service.js'

const freshQuery = z.looseObject({ fresh: z.enum(['0', '1']).optional() })

export function registerCalendarRoutes(
  app: FastifyInstance,
  { session }: RouteContext,
  calendar: CalendarService,
): void {
  /**
   * `GET /calendar?from=&to=&fresh=` → tus eventos entre dos instantes
   * (ISO-8601): los de Sanatorio y los de 42. Como mucho, 62 días de una vez.
   * Con `fresh=1`, lo de 42 se vuelve a pedir si tiene más de dos minutos.
   */
  app.get<{ Querystring: { from?: string; to?: string; fresh?: string } }>(
    '/calendar',
    async (request, reply) => {
      const actor = await session.actor(request)
      const { fresh } = parse(freshQuery, request.query)

      return reply.send(
        await calendar.between(
          actor,
          session.user(request).id,
          request.query.from,
          request.query.to,
          fresh === '1',
        ),
      )
    },
  )
}
