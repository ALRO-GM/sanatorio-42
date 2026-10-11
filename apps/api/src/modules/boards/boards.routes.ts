/**
 * Rutas del calendario de pizarras.
 */

import type { FastifyInstance } from 'fastify'

import { idParam } from '../../core/http/params.js'
import type { IdParams } from '../../core/http/params.js'
import type { RouteContext } from '../../core/module.js'
import type { BoardsService } from './boards.service.js'

export function registerBoardsRoutes(
  app: FastifyInstance,
  { session }: RouteContext,
  boards: BoardsService,
): void {
  /** `GET /boards?from=&to=` → pizarras del campus en ese intervalo (ISO-8601). */
  app.get<{ Querystring: { from?: string; to?: string } }>('/boards', async (request, reply) => {
    return reply.send(
      await boards.list(await session.actor(request), request.query.from, request.query.to),
    )
  })

  /** `POST /boards` → propone una pizarra. */
  app.post('/boards', async (request, reply) => {
    return reply.code(201).send(await boards.create(await session.actor(request), request.body))
  })

  /** `PUT /boards/:id` → cambia la pizarra. Solo quien la imparte, o quien modera. */
  app.put<IdParams>('/boards/:id', async (request, reply) => {
    return reply.send(
      await boards.update(
        await session.actor(request),
        idParam(request.params.id, 'La pizarra'),
        request.body,
      ),
    )
  })

  app.post<IdParams>('/boards/:id/join', async (request, reply) => {
    await boards.join(await session.actor(request), idParam(request.params.id, 'La pizarra'))

    return reply.code(204).send()
  })

  app.delete<IdParams>('/boards/:id/join', async (request, reply) => {
    await boards.leave(await session.actor(request), idParam(request.params.id, 'La pizarra'))

    return reply.code(204).send()
  })

  /** `DELETE /boards/:id` → la cancela. Solo quien la imparte, o quien modera. */
  app.delete<IdParams>('/boards/:id', async (request, reply) => {
    await boards.cancel(await session.actor(request), idParam(request.params.id, 'La pizarra'))

    return reply.code(204).send()
  })
}
