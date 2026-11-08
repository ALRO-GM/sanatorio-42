/**
 * Módulo `k8scourse`: el curso de Kubernetes de Not-games (`docs/curso-kubernetes.md`).
 * Se corrige como los de shell y Docker (el servicio es el mismo, con el motor
 * de `@sanatorio/k8ssim` y sus tablas, migración 88): la web juega en la
 * terminal simulada y manda las órdenes; aquí se vuelven a ejecutar, se ponen
 * las estrellas y, en los jefes, el tiempo lo mide el reloj de la API.
 */

import { checkAttempt, estimateOf, FINALS, LIMITS, TIERS, UNITS } from '@sanatorio/k8ssim'

import type { Db } from '../../core/db/database.js'
import { slugParam } from '../../core/http/params.js'
import type { AppModule } from '../../core/module.js'
import {
  createCourseTimes,
  createShellCourseRepository,
  createShellCourseService,
} from '../shellcourse/index.js'
import type { TerminalCourse } from '../shellcourse/index.js'

const K8S: TerminalCourse<(typeof UNITS)[number]> = {
  name: 'k8s',
  units: UNITS,
  finals: FINALS,
  tiers: TIERS,
  limits: LIMITS,
  checkAttempt,
  estimateOf,
}

function createK8sCourseService(deps: { db: Db; now?: () => number }) {
  return createShellCourseService({
    progress: createShellCourseRepository(deps.db, { progress: 'k8s_progress', runs: 'k8s_runs' }),
    times: createCourseTimes(deps.db),
    course: K8S,
    ...(deps.now === undefined ? {} : { now: deps.now }),
  })
}

type K8sCourseService = ReturnType<typeof createK8sCourseService>

export type K8sCourseModule = AppModule & { service: K8sCourseService }

export function createK8sCourseModule(deps: { db: Db; now?: () => number }): K8sCourseModule {
  const service = createK8sCourseService(deps)

  return {
    name: 'k8scourse',
    // `course_times` ya la declara el módulo `shellcourse` (es de todos los cursos).
    personal: [
      { table: 'k8s_progress', logins: ['login'] },
      { table: 'k8s_runs', logins: ['login'] },
    ],
    service,
    routes: (app, { session }) => {
      const unit = (id: string): string => slugParam(id, 'Ese punto del curso')

      /** `GET /k8scourse` → `K8sCourse`: tus estrellas, contrarrelojes en marcha y certificados. */
      app.get('/k8scourse', async (request, reply) => {
        return reply.send(await service.course(await session.actor(request)))
      })

      /** `POST /k8scourse/units/:id` → `K8sAttemptInput` → `K8sAttemptResult`: corrige una prueba o un jefe. */
      app.post<{ Params: { id: string } }>('/k8scourse/units/:id', async (request, reply) => {
        return reply.send(
          await service.attempt(
            await session.actor(request),
            unit(request.params.id),
            request.body,
          ),
        )
      })

      /** `POST /k8scourse/bosses/:id/start` → `K8sBossStart`: pone en marcha el reloj de un jefe. */
      app.post<{ Params: { id: string } }>(
        '/k8scourse/bosses/:id/start',
        async (request, reply) => {
          return reply.send(
            await service.startBoss(await session.actor(request), unit(request.params.id)),
          )
        },
      )
    },
  }
}
