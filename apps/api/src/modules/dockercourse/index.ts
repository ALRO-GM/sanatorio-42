/**
 * Módulo `dockercourse`: el curso de Docker de Not-games (`docs/curso-docker.md`).
 * Se corrige como el de shell (el servicio es el mismo, con el motor de
 * `@sanatorio/dockersim` y sus tablas, migración 87): la web juega en la
 * terminal simulada y manda las órdenes; aquí se vuelven a ejecutar, se ponen
 * las estrellas y, en los jefes, el tiempo lo mide el reloj de la API.
 */

import { checkAttempt, estimateOf, FINALS, LIMITS, TIERS, UNITS } from '@sanatorio/dockersim'

import type { Db } from '../../core/db/database.js'
import { slugParam } from '../../core/http/params.js'
import type { AppModule } from '../../core/module.js'
import {
  createCourseTimes,
  createShellCourseRepository,
  createShellCourseService,
} from '../shellcourse/index.js'
import type { TerminalCourse } from '../shellcourse/index.js'

const DOCKER: TerminalCourse<(typeof UNITS)[number]> = {
  name: 'docker',
  units: UNITS,
  finals: FINALS,
  tiers: TIERS,
  limits: LIMITS,
  checkAttempt,
  estimateOf,
}

function createDockerCourseService(deps: { db: Db; now?: () => number }) {
  return createShellCourseService({
    progress: createShellCourseRepository(deps.db, {
      progress: 'docker_progress',
      runs: 'docker_runs',
    }),
    times: createCourseTimes(deps.db),
    course: DOCKER,
    ...(deps.now === undefined ? {} : { now: deps.now }),
  })
}

type DockerCourseService = ReturnType<typeof createDockerCourseService>

export type DockerCourseModule = AppModule & { service: DockerCourseService }

export function createDockerCourseModule(deps: { db: Db; now?: () => number }): DockerCourseModule {
  const service = createDockerCourseService(deps)

  return {
    name: 'dockercourse',
    // `course_times` ya la declara el módulo `shellcourse` (es de todos los cursos).
    personal: [
      { table: 'docker_progress', logins: ['login'] },
      { table: 'docker_runs', logins: ['login'] },
    ],
    service,
    routes: (app, { session }) => {
      const unit = (id: string): string => slugParam(id, 'Ese punto del curso')

      /** `GET /dockercourse` → `DockerCourse`: tus estrellas, contrarrelojes en marcha y certificados. */
      app.get('/dockercourse', async (request, reply) => {
        return reply.send(await service.course(await session.actor(request)))
      })

      /** `POST /dockercourse/units/:id` → `DockerAttemptInput` → `DockerAttemptResult`: corrige una prueba o un jefe. */
      app.post<{ Params: { id: string } }>('/dockercourse/units/:id', async (request, reply) => {
        return reply.send(
          await service.attempt(
            await session.actor(request),
            unit(request.params.id),
            request.body,
          ),
        )
      })

      /** `POST /dockercourse/bosses/:id/start` → `DockerBossStart`: pone en marcha el reloj de un jefe. */
      app.post<{ Params: { id: string } }>(
        '/dockercourse/bosses/:id/start',
        async (request, reply) => {
          return reply.send(
            await service.startBoss(await session.actor(request), unit(request.params.id)),
          )
        },
      )
    },
  }
}
