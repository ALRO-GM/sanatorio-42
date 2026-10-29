/**
 * Módulo `exams`: estadísticas de los exámenes (intentos hasta aprobar y notas
 * de cada intento), de cuánto se tarda en cada círculo y del black hole, por
 * plan y por kickoff.
 *
 * Su tabla (`exam_attempts`) la llena la réplica al copiar las filas de los
 * exámenes; aquí hay además una copia de fondo de los intentos antiguos.
 */

import { NO_POOL, visibleTo } from '../../core/audience.js'
import type { Actor } from '../../core/actor.js'
import type { LiveExam, LiveExamGroup } from '@sanatorio/contracts'
import type { Audience } from '../../core/audience.js'
import type { Db } from '../../core/db/database.js'
import type { AppModule } from '../../core/module.js'
import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import type { Agenda, Curriculum, QuotaGate, ReplicaRepository } from '../replica/index.js'
import { createExamsLive } from './exams.live.js'
import type { ExamsLive } from './exams.live.js'
import { createExamsRepository } from './exams.repository.js'
import { createExamsService } from './exams.service.js'
import type { ExamsService } from './exams.service.js'
import { createExamsSync } from './exams.sync.js'
import type { ExamsSync } from './exams.sync.js'
import { given } from '../../core/options.js'

type ExamsModuleDeps = {
  db: Db
  /** Quién ve a quién: estudiantes y piscineros separados (`docs/piscineros.md`). */
  audience?: Audience
  client: FortyTwoClient
  replica: ReplicaRepository
  agenda: Agenda
  curriculum: Curriculum
  campusIds: readonly number[]
  quota: QuotaGate
  hourlyReserve: number
  log?: (message: string) => void
  now?: () => number
}

export type ExamsModule = AppModule & { service: ExamsService; sync: ExamsSync; live: ExamsLive }

/** Cada cuánto se copia una página de intentos antiguos (si toca). */
const BACKFILL_EVERY_MS = 60_000
/** Cada cuánto se mira si toca refrescar un examen en marcha (toca cada cinco minutos). */
const LIVE_TICK_MS = 60_000

export function createExamsModule(deps: ExamsModuleDeps): ExamsModule {
  /** En el examen en vivo, solo la gente del mundo de quien mira. */
  const seenGroups = (actor: Actor, groups: LiveExamGroup[]): Promise<LiveExamGroup[]> =>
    Promise.all(
      groups.map(async (group) => ({
        ...group,
        people: await visibleTo(deps.audience ?? NO_POOL, actor, group.people, (one) => one.login),
      })),
    )
  const seenLive = async (actor: Actor, exam: LiveExam): Promise<LiveExam> => ({
    ...exam,
    groups: await seenGroups(actor, exam.groups),
    // El último examen acabado, con el mismo filtro.
    last:
      exam.last === null
        ? null
        : { ...exam.last, groups: await seenGroups(actor, exam.last.groups) },
  })
  const exams = createExamsRepository(deps.db)
  const sync = createExamsSync({
    client: deps.client,
    replica: deps.replica,
    exams,
    campusIds: deps.campusIds,
    quota: deps.quota,
    hourlyReserve: deps.hourlyReserve,
    ...given({ log: deps.log }),
  })
  const service = createExamsService({
    exams,
    sync,
    curriculum: deps.curriculum,
    ...given({ now: deps.now }),
  })
  const live = createExamsLive({
    db: deps.db,
    client: deps.client,
    replica: deps.replica,
    agenda: deps.agenda,
    curriculum: deps.curriculum,
    exams,
    quota: deps.quota,
    ...given({ now: deps.now, log: deps.log }),
  })

  return {
    name: 'exams',
    service,
    sync,
    live,
    // Los intentos de examen de cada cual, por su id de 42 (como `project_users`).
    personal: [{ table: 'exam_attempts', userIds: ['user_id'], source: '42' }],
    routes: (app, { session }) => {
      /**
       * `GET /exams/stats?track=all|classic|next&kickoffs=AAAA-MM,…` → exámenes,
       * círculos, kickoffs y black hole del campus que miras.
       */
      app.get('/exams/stats', async (request, reply) => {
        reply.header('Cache-Control', 'private, max-age=300')

        return reply.send(await service.stats(await session.actor(request), request.query))
      })

      /**
       * `GET /exams/live` → el examen que hay ahora en tu campus (o el siguiente
       * de hoy): quién está apuntado, qué examen hace y su última nota.
       */
      app.get('/exams/live', async (request, reply) => {
        const actor = await session.actor(request)

        return reply.send(await seenLive(actor, await live.live(actor)))
      })

      /**
       * `POST /exams/live/refresh` → lo mismo, pidiendo antes lo nuevo a 42 si
       * hace al menos un minuto del último refresco (de quien sea).
       */
      app.post('/exams/live/refresh', async (request, reply) => {
        const actor = await session.actor(request)

        return reply.send(await seenLive(actor, await live.refreshNow(actor)))
      })
    },
    jobs: [
      {
        name: 'intentos de examen antiguos',
        usage: 'exam-history',
        everyMs: BACKFILL_EVERY_MS,
        run: async () => {
          await sync.step()
        },
      },
      {
        name: 'examen en vivo',
        usage: 'exam-live',
        everyMs: LIVE_TICK_MS,
        run: async () => {
          await live.tick(deps.campusIds)
        },
      },
    ],
  }
}

export type { ExamsService } from './exams.service.js'
