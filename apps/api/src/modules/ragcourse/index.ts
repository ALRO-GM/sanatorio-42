/**
 * Módulo `ragcourse`: el curso de RAG de Aprender (`docs/curso-rag.md`). Se
 * corrige como los cursos de terminal (el servicio es el mismo, con el motor de
 * `@sanatorio/ragsim` y sus tablas, migración 93): la web juega en el banco de
 * pruebas y manda sus comprobaciones; aquí se vuelven a corregir una a una, se
 * ponen las estrellas y, en los jefes, el tiempo lo mide el reloj de la API.
 */

import { checkAttempt, estimateOf, FINALS, LIMITS, TIERS, UNITS } from '@sanatorio/ragsim'

import type { Db } from '../../core/db/database.js'
import { slugParam } from '../../core/http/params.js'
import type { AppModule } from '../../core/module.js'
import {
  createCourseTimes,
  createShellCourseRepository,
  createShellCourseService,
} from '../shellcourse/index.js'
import type { TerminalCourse } from '../shellcourse/index.js'

const RAG: TerminalCourse<(typeof UNITS)[number]> = {
  name: 'rag',
  units: UNITS,
  finals: FINALS,
  tiers: TIERS,
  // Cada entrada es una comprobación (un JSON corto), no una orden de terminal.
  limits: LIMITS,
  checkAttempt,
  estimateOf,
}

function createRagCourseService(deps: { db: Db; now?: () => number }) {
  return createShellCourseService({
    progress: createShellCourseRepository(deps.db, { progress: 'rag_progress', runs: 'rag_runs' }),
    times: createCourseTimes(deps.db),
    course: RAG,
    ...(deps.now === undefined ? {} : { now: deps.now }),
  })
}

type RagCourseService = ReturnType<typeof createRagCourseService>

export type RagCourseModule = AppModule & { service: RagCourseService }

export function createRagCourseModule(deps: { db: Db; now?: () => number }): RagCourseModule {
  const service = createRagCourseService(deps)

  return {
    name: 'ragcourse',
    // `course_times` ya la declara el módulo `shellcourse` (es de todos los cursos).
    personal: [
      { table: 'rag_progress', logins: ['login'] },
      { table: 'rag_runs', logins: ['login'] },
    ],
    service,
    routes: (app, { session }) => {
      const unit = (id: string): string => slugParam(id, 'Ese punto del curso')

      /** `GET /ragcourse` → `RagCourse`: tus estrellas, contrarrelojes en marcha y certificados. */
      app.get('/ragcourse', async (request, reply) => {
        return reply.send(await service.course(await session.actor(request)))
      })

      /** `POST /ragcourse/units/:id` → `RagAttemptInput` → `RagAttemptResult`: corrige una prueba o un jefe. */
      app.post<{ Params: { id: string } }>('/ragcourse/units/:id', async (request, reply) => {
        return reply.send(
          await service.attempt(
            await session.actor(request),
            unit(request.params.id),
            request.body,
          ),
        )
      })

      /** `POST /ragcourse/bosses/:id/start` → `RagBossStart`: pone en marcha el reloj de un jefe. */
      app.post<{ Params: { id: string } }>(
        '/ragcourse/bosses/:id/start',
        async (request, reply) => {
          return reply.send(
            await service.startBoss(await session.actor(request), unit(request.params.id)),
          )
        },
      )
    },
  }
}
