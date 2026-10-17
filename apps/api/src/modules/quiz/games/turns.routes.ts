/**
 * Rutas de los juegos por turnos con pregunta de Not-games (ajedrez).
 */

import type { FastifyInstance } from 'fastify'

import { idParam } from '../../../core/http/params.js'
import type { IdParams } from '../../../core/http/params.js'
import type { RouteContext } from '../../../core/module.js'
import type { ChessService } from './index.js'

export function registerTurnRoutes(
  app: FastifyInstance,
  { session }: RouteContext,
  games: ChessService,
): void {
  const room = (id: string): number => idParam(id, 'La sala')

  /** `GET /games/rooms` → las salas por turnos abiertas del campus y las tuyas recientes. */
  app.get('/games/rooms', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store')

    return reply.send(await games.list(await session.actor(request)))
  })

  /** `POST /games/rooms` → `TurnSettings`: crea una sala y entras con el bando `a`. */
  app.post('/games/rooms', async (request, reply) => {
    return reply.code(201).send(await games.create(await session.actor(request), request.body))
  })

  /** `GET /games/rooms/:id` → cómo va la partida ahora (la web lo pide cada segundo). */
  app.get<IdParams>('/games/rooms/:id', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store')

    return reply.send(await games.view(await session.actor(request), room(request.params.id)))
  })

  /** `POST /games/rooms/:id/join` → entra con el bando que quede libre. */
  app.post<IdParams>('/games/rooms/:id/join', async (request, reply) => {
    return reply.send(await games.join(await session.actor(request), room(request.params.id)))
  })

  /** `POST /games/rooms/:id/leave` → sale (jugando, pierde). 204. */
  app.post<IdParams>('/games/rooms/:id/leave', async (request, reply) => {
    await games.leave(await session.actor(request), room(request.params.id))

    return reply.code(204).send()
  })

  /** `POST /games/rooms/:id/start` → empieza la partida. Solo quien la creó. */
  app.post<IdParams>('/games/rooms/:id/start', async (request, reply) => {
    return reply.send(await games.start(await session.actor(request), room(request.params.id)))
  })

  /** `POST /games/rooms/:id/move` → `{ from, to, promotion? }`: mueve quien tiene el turno. */
  app.post<IdParams>('/games/rooms/:id/move', async (request, reply) => {
    return reply.send(
      await games.move(await session.actor(request), room(request.params.id), request.body),
    )
  })

  /** `POST /games/rooms/:id/answer` → `{ question, option }`: contesta la pregunta entre jugadas. */
  app.post<IdParams>('/games/rooms/:id/answer', async (request, reply) => {
    return reply.send(
      await games.answer(await session.actor(request), room(request.params.id), request.body),
    )
  })

  /** `POST /games/rooms/:id/resign` → abandona la partida: gana el otro bando. */
  app.post<IdParams>('/games/rooms/:id/resign', async (request, reply) => {
    return reply.send(await games.resign(await session.actor(request), room(request.params.id)))
  })
}
