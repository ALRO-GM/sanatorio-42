/**
 * Rutas de la valoración de las correcciones de 42.
 */

import type { FastifyInstance } from 'fastify'

import { idParam } from '../../core/http/params.js'
import type { IdParams } from '../../core/http/params.js'
import type { RouteContext } from '../../core/module.js'
import type { FeedbackService } from './feedback.service.js'

export function registerFeedbackRoutes(
  app: FastifyInstance,
  { session }: RouteContext,
  feedback: FeedbackService,
): void {
  /** `GET /corrections/pending` → tus correcciones recientes por valorar, la última primero. */
  app.get('/corrections/pending', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store')

    return reply.send(await feedback.pending(await session.actor(request)))
  })

  /**
   * `POST /corrections/:id/feedback` → `{ understanding, reaction? }` si te
   * corrigieron; `{ tag }` si corregiste tú. 204.
   *
   * `POST /corrections/:id/skip` → `{ forever }`: «Ahora no» o «No volver a
   * preguntar». 204.
   */
  for (const action of ['feedback', 'skip'] as const) {
    app.post<IdParams>(`/corrections/:id/${action}`, async (request, reply) => {
      const actor = await session.actor(request)
      const id = idParam(request.params.id, 'La corrección')

      await (action === 'feedback'
        ? feedback.rate(actor, id, request.body)
        : feedback.skip(actor, id, request.body))

      return reply.code(204).send()
    })
  }

  /** `GET /corrections/understood` → qué tal entendió, en total, la gente a la que corregiste. */
  app.get('/corrections/understood', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store')

    return reply.send(await feedback.understood(await session.actor(request)))
  })
}
