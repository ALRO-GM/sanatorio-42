/**
 * Módulo `shellcourse`: el curso de shell de Linux de Not-games
 * (`docs/curso-shell.md`).
 */

import type { Db } from '../../core/db/database.js'
import { slugParam } from '../../core/http/params.js'
import type { AppModule } from '../../core/module.js'
import { createCourseTimes } from './course-times.js'
import { createShellCourseRepository, createShellCourseService } from './shellcourse.service.js'
import type { ShellCourseService } from './shellcourse.service.js'

export { activeSecondsSchema, createCourseTimes } from './course-times.js'
export type { CourseTimes } from './course-times.js'

export type ShellCourseModule = AppModule & { service: ShellCourseService }

export function createShellCourseModule(deps: { db: Db; now?: () => number }): ShellCourseModule {
  const service = createShellCourseService({
    progress: createShellCourseRepository(deps.db),
    times: createCourseTimes(deps.db),
    ...(deps.now === undefined ? {} : { now: deps.now }),
  })

  return {
    name: 'shellcourse',
    personal: [
      { table: 'shell_progress', logins: ['login'] },
      { table: 'shell_runs', logins: ['login'] },
      // También las del curso de git: la tabla es de los dos (`course-times.ts`).
      { table: 'course_times', logins: ['login'] },
    ],
    service,
    routes: (app, { session }) => {
      const unit = (id: string): string => slugParam(id, 'Ese punto del curso')

      /** `GET /shellcourse` → `ShellCourse`: tus estrellas, contrarrelojes en marcha y certificados. */
      app.get('/shellcourse', async (request, reply) => {
        return reply.send(await service.course(await session.actor(request)))
      })

      /** `POST /shellcourse/units/:id` → `ShellAttemptInput` → `ShellAttemptResult`: corrige una prueba o un jefe. */
      app.post<{ Params: { id: string } }>('/shellcourse/units/:id', async (request, reply) => {
        return reply.send(
          await service.attempt(
            await session.actor(request),
            unit(request.params.id),
            request.body,
          ),
        )
      })

      /** `POST /shellcourse/bosses/:id/start` → `ShellBossStart`: pone en marcha el reloj de un jefe. */
      app.post<{ Params: { id: string } }>(
        '/shellcourse/bosses/:id/start',
        async (request, reply) => {
          return reply.send(
            await service.startBoss(await session.actor(request), unit(request.params.id)),
          )
        },
      )
    },
  }
}
