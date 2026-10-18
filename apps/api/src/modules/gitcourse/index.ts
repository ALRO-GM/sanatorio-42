/**
 * Módulo `gitcourse`: el curso de git de Not-games (#42 del buzón).
 */

import type { Db } from '../../core/db/database.js'
import type { AppModule } from '../../core/module.js'
import { createGitCourseRepository, createGitCourseService } from './gitcourse.service.js'
import type { GitCourseService } from './gitcourse.service.js'

export type GitCourseModule = AppModule & { service: GitCourseService }

export function createGitCourseModule(deps: {
  db: Db
  seatOf: (login: string) => Promise<string | null>
  now?: () => number
}): GitCourseModule {
  const service = createGitCourseService({
    progress: createGitCourseRepository(deps.db),
    seatOf: deps.seatOf,
    ...(deps.now === undefined ? {} : { now: deps.now }),
  })

  return {
    name: 'gitcourse',
    personal: [{ table: 'git_progress', logins: ['login'] }],
    service,
    routes: (app, { session }) => {
      /** `GET /gitcourse` → `GitCourse`: tus estrellas y desde qué puesto juegas. */
      app.get('/gitcourse', async (request, reply) => {
        reply.header('Cache-Control', 'private, no-store')

        return reply.send(await service.course(await session.actor(request)))
      })

      /** `POST /gitcourse/levels/:id` → `GitAttemptResult`: corrige un reto. */
      app.post<{ Params: { id: string } }>('/gitcourse/levels/:id', async (request, reply) => {
        return reply.send(
          await service.attempt(await session.actor(request), request.params.id, request.body),
        )
      })
    },
  }
}
