/**
 * Rutas de Not-games.
 */

import type { FastifyInstance } from 'fastify'

import { idParam } from '../../core/http/params.js'
import type { IdParams } from '../../core/http/params.js'
import type { RouteContext } from '../../core/module.js'
import type { QuizService } from './quiz.service.js'

export function registerQuizRoutes(
  app: FastifyInstance,
  { session }: RouteContext,
  quiz: QuizService,
): void {
  const room = (id: string): number => idParam(id, 'La sala')

  /** `GET /quiz/rooms` → las salas abiertas del campus y las tuyas recientes. */
  app.get('/quiz/rooms', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store')

    return reply.send(await quiz.list(await session.actor(request)))
  })

  /** `POST /quiz/rooms` → `QuizSettings`: crea una sala y entras en ella. */
  app.post('/quiz/rooms', async (request, reply) => {
    return reply.code(201).send(await quiz.create(await session.actor(request), request.body))
  })

  /** `GET /quiz/rooms/:id` → cómo va la sala ahora (la web lo pide cada segundo jugando). */
  app.get<IdParams>('/quiz/rooms/:id', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store')

    return reply.send(await quiz.view(await session.actor(request), room(request.params.id)))
  })

  /** `POST /quiz/rooms/:id/join` → `{ team? }`: entra, o cambia de equipo. */
  app.post<IdParams>('/quiz/rooms/:id/join', async (request, reply) => {
    return reply.send(
      await quiz.join(await session.actor(request), room(request.params.id), request.body),
    )
  })

  /** `POST /quiz/rooms/:id/leave` → sale de la sala. 204. */
  app.post<IdParams>('/quiz/rooms/:id/leave', async (request, reply) => {
    await quiz.leave(await session.actor(request), room(request.params.id))

    return reply.code(204).send()
  })

  /** `POST /quiz/rooms/:id/start` → empieza la partida. Solo quien la creó. */
  app.post<IdParams>('/quiz/rooms/:id/start', async (request, reply) => {
    return reply.send(await quiz.start(await session.actor(request), room(request.params.id)))
  })

  /** `POST /quiz/rooms/:id/answer` → `{ question, option }`: contesta la pregunta de ahora. */
  app.post<IdParams>('/quiz/rooms/:id/answer', async (request, reply) => {
    return reply.send(
      await quiz.answer(await session.actor(request), room(request.params.id), request.body),
    )
  })
}
