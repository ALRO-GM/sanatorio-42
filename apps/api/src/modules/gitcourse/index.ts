/**
 * Módulo `gitcourse`: el curso de git de Not-games (#42 del buzón).
 */

import type { Db } from '../../core/db/database.js'
import type { AppModule } from '../../core/module.js'
import { createGateRepository, createGateService } from './gates.js'
import type { GateQuestions } from './gates.js'
import { createGitCourseRepository, createGitCourseService } from './gitcourse.service.js'
import type { GitCourseService } from './gitcourse.service.js'

export type GitCourseModule = AppModule & { service: GitCourseService }

export function createGitCourseModule(deps: {
  db: Db
  seatOf: (login: string) => Promise<string | null>
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
  const service = createGitCourseService({
    progress: createGitCourseRepository(deps.db),
    gates,
    seatOf: deps.seatOf,
    ...(deps.now === undefined ? {} : { now: deps.now }),
  })

  return {
    name: 'gitcourse',
    personal: [
      { table: 'git_progress', logins: ['login'] },
      { table: 'git_gates', logins: ['login'] },
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
    },
  }
}
