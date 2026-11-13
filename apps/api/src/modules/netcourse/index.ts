/**
 * Módulo `netcourse`: el curso de NetPractice (`docs/curso-netpractice.md`).
 * No se juega en una terminal sino en un esquema de red que se configura, pero
 * se corrige con el mismo servicio que los cursos de terminal: lo que llega
 * son las **comprobaciones** hechas (los campos del esquema, en JSON, cada vez
 * que se pulsó «Comprobar»); aquí se vuelven a mirar con el motor de
 * `@sanatorio/netsim`, se ponen las estrellas (por comprobaciones) y, en los
 * jefes, el tiempo lo mide el reloj de la API. Tablas de la migración 92.
 */

import { checkAttempt, estimateOf, FINALS, LIMITS, TIERS, UNITS } from '@sanatorio/netsim'

import type { Db } from '../../core/db/database.js'
import { slugParam } from '../../core/http/params.js'
import type { AppModule } from '../../core/module.js'
import {
  createCourseTimes,
  createShellCourseRepository,
  createShellCourseService,
} from '../shellcourse/index.js'

function createNetCourseService(deps: { db: Db; now?: () => number }) {
  return createShellCourseService({
    progress: createShellCourseRepository(deps.db, { progress: 'net_progress', runs: 'net_runs' }),
    times: createCourseTimes(deps.db),
    course: {
      name: 'net',
      units: UNITS,
      finals: FINALS,
      tiers: TIERS,
      limits: LIMITS,
      checkAttempt,
      estimateOf,
    },
    ...(deps.now === undefined ? {} : { now: deps.now }),
  })
}

export type NetCourseModule = AppModule & { service: ReturnType<typeof createNetCourseService> }

export function createNetCourseModule(deps: { db: Db; now?: () => number }): NetCourseModule {
  const service = createNetCourseService(deps)
  const point = (id: string): string => slugParam(id, 'Ese punto del curso')

  return {
    name: 'netcourse',
    // `course_times` ya la declara el módulo `shellcourse` (es de todos los cursos).
    personal: ['net_progress', 'net_runs'].map((table) => ({ table, logins: ['login'] })),
    service,
    routes: (app, { session }) => {
      /** `GET /netcourse` → `NetCourse`: tus estrellas, contrarrelojes en marcha y certificados. */
      app.get('/netcourse', async (request, reply) =>
        reply.send(await service.course(await session.actor(request))),
      )

      /** `POST /netcourse/units/:id` → `NetAttemptInput` → `NetAttemptResult`: corrige una prueba o un jefe. */
      app.post<{ Params: { id: string } }>('/netcourse/units/:id', async (request, reply) => {
        const actor = await session.actor(request)

        return reply.send(await service.attempt(actor, point(request.params.id), request.body))
      })

      /** `POST /netcourse/bosses/:id/start` → `NetBossStart`: pone en marcha el reloj de un jefe. */
      app.post<{ Params: { id: string } }>(
        '/netcourse/bosses/:id/start',
        async (request, reply) => {
          const actor = await session.actor(request)

          return reply.send(await service.startBoss(actor, point(request.params.id)))
        },
      )
    },
  }
}
