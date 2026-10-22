/**
 * Módulo `gitcourse`: el curso de git de Not-games (#42 del buzón).
 */

import type { Db } from '../../core/db/database.js'
import { idParam } from '../../core/http/params.js'
import type { IdParams } from '../../core/http/params.js'
import type { AppModule } from '../../core/module.js'
import { createGateRepository, createGateService } from './gates.js'
import type { GateQuestions } from './gates.js'
import { createGitCourseRepository, createGitCourseService } from './gitcourse.service.js'
import type { GitCourseService } from './gitcourse.service.js'
import { createRoomRepository, createRoomService } from './rooms.js'
import type { RoomService } from './rooms.js'

export type GitCourseModule = AppModule & { service: GitCourseService & { rooms: RoomService } }

export function createGitCourseModule(deps: {
  db: Db
  seatOf: (login: string) => Promise<string | null>
  imagesOf: (logins: readonly string[]) => Promise<Map<string, string | null>>
  /** Las preguntas del banco de Not-games (para el test previo). */
  questions: GateQuestions
  now?: () => number
  random?: () => number
}): GitCourseModule {
  const gates = createGateService({
    gates: createGateRepository(deps.db),
    questions: deps.questions,
    now: deps.now ?? Date.now,
    random: deps.random ?? Math.random,
  })
  const progress = createGitCourseRepository(deps.db)
  const now = deps.now ?? Date.now
  const rooms = createRoomService({
    rooms: createRoomRepository(deps.db),
    seatOf: deps.seatOf,
    imagesOf: deps.imagesOf,
    passedQuiz: async (login, gate) => (await gates.states(login))[gate]?.passed === true,
    // Superar una prueba de grupo cuenta en el camino como un punto con tres estrellas.
    award: (login, gate, commands, at) => progress.save(login, gate, 3, commands, at),
    now,
  })
  const service = {
    ...createGitCourseService({ progress, gates, seatOf: deps.seatOf, now }),
    rooms,
  }

  return {
    name: 'gitcourse',
    personal: [
      { table: 'git_progress', logins: ['login'] },
      { table: 'git_gates', logins: ['login'] },
      { table: 'git_rooms', logins: ['host'] },
      { table: 'git_room_players', logins: ['login'] },
    ],
    service,
    routes: (app, { session }) => {
      /** `GET /gitcourse` → `GitCourse`: tus estrellas y desde qué puesto juegas. */
      app.get('/gitcourse', async (request, reply) => {
        reply.header('Cache-Control', 'private, no-store')

        return reply.send(await service.course(await session.actor(request)))
      })

      /** `POST /gitcourse/gates/:id/start` → `GitGateQuiz`: empieza (o retoma) el test previo. */
      app.post<{ Params: { id: string } }>('/gitcourse/gates/:id/start', async (request, reply) => {
        return reply.send(await service.startGate(await session.actor(request), request.params.id))
      })

      /** `POST /gitcourse/gates/:id/answer` → `GitGateAnswerInput` → `GitGateResult`. */
      app.post<{ Params: { id: string } }>(
        '/gitcourse/gates/:id/answer',
        async (request, reply) => {
          return reply.send(
            await service.answerGate(await session.actor(request), request.params.id, request.body),
          )
        },
      )

      /** `POST /gitcourse/levels/:id` → `GitAttemptResult`: corrige un reto. */
      app.post<{ Params: { id: string } }>('/gitcourse/levels/:id', async (request, reply) => {
        return reply.send(
          await service.attempt(await session.actor(request), request.params.id, request.body),
        )
      })

      const room = (id: string): number => idParam(id, 'La sala')

      /** `GET /gitcourse/rooms?gate=group1` → `GitRoomLobby[]`: salas de esa prueba. */
      app.get<{ Querystring: { gate?: string } }>('/gitcourse/rooms', async (request, reply) => {
        reply.header('Cache-Control', 'private, no-store')

        return reply.send(await rooms.list(await session.actor(request), request.query.gate ?? ''))
      })

      /** `POST /gitcourse/rooms` → `{ gate }` → `GitRoom`: crea una sala y entras. */
      app.post('/gitcourse/rooms', async (request, reply) => {
        return reply.code(201).send(await rooms.create(await session.actor(request), request.body))
      })

      /** `GET /gitcourse/rooms/:id` → `GitRoom` (la web lo pide cada dos segundos). */
      app.get<IdParams>('/gitcourse/rooms/:id', async (request, reply) => {
        reply.header('Cache-Control', 'private, no-store')

        return reply.send(await rooms.view(await session.actor(request), room(request.params.id)))
      })

      /** `POST /gitcourse/rooms/:id/join` → `GitRoom`. */
      app.post<IdParams>('/gitcourse/rooms/:id/join', async (request, reply) => {
        return reply.send(await rooms.join(await session.actor(request), room(request.params.id)))
      })

      /** `POST /gitcourse/rooms/:id/leave` → 204. */
      app.post<IdParams>('/gitcourse/rooms/:id/leave', async (request, reply) => {
        await rooms.leave(await session.actor(request), room(request.params.id))

        return reply.code(204).send()
      })

      /** `POST /gitcourse/rooms/:id/start` → `GitRoom`: solo quien la creó. */
      app.post<IdParams>('/gitcourse/rooms/:id/start', async (request, reply) => {
        return reply.send(await rooms.start(await session.actor(request), room(request.params.id)))
      })

      /** `POST /gitcourse/rooms/:id/run` → `GitRunInput` → `GitRunResult`: una línea de la terminal. */
      app.post<IdParams>('/gitcourse/rooms/:id/run', async (request, reply) => {
        return reply.send(
          await rooms.run(await session.actor(request), room(request.params.id), request.body),
        )
      })
    },
    jobs: [
      {
        name: 'limpieza de salas del curso de git',
        everyMs: 3_600_000,
        run: async () => {
          await rooms.prune()
        },
      },
    ],
  }
}
