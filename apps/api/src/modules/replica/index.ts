/**
 * Módulo `replica`: la copia local de 42 y quien la mantiene al día.
 *
 * Es la base de todos los demás: ninguno llama a la API de 42, todos leen de
 * aquí. El único que gasta peticiones es el sincronizador.
 */

import { maintain } from '../../core/db/database.js'
import type { Db } from '../../core/db/database.js'
import type { AppModule } from '../../core/module.js'
import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import { createAgenda } from './agenda.js'
import type { Agenda } from './agenda.js'
import { createCurriculum } from './curriculum.js'
import type { Curriculum } from './curriculum.js'
import { createCampusesService } from './campuses.service.js'
import { DRAIN_EVERY_MS, createQuota } from './quota.js'
import type { Quota } from './quota.js'
import type { CampusesService } from './campuses.service.js'
import { createPhotos, memoryPhotoStore } from './photos.js'
import type { PhotoStore } from './photos.js'
import { createReplicaRepository } from './replica.repository.js'
import type { ReplicaRepository } from './replica.repository.js'
import { registerReplicaRoutes } from './replica.routes.js'
import { createSyncer } from './syncer.js'
import type { Syncer, SyncerConfig } from './syncer.js'
import { given } from '../../core/options.js'

type ReplicaModuleDeps = {
  db: Db
  client: FortyTwoClient
  config: SyncerConfig
  /** `false` para no arrancar el bucle de fondo aunque se llame a `start`. */
  backgroundSync?: boolean
  /** `true` si el servicio está cortado por el límite del plan: no se pide nada a 42. */
  halted?: () => boolean
  /** Quién no hace cola cuando la cuota de 42 va justa (quien administra). */
  priority?: (login: string) => boolean
  /** Dónde se guardan las fotos de perfil bajadas de 42. Sin él, en memoria. */
  photos?: PhotoStore
  log?: (message: string) => void
  now?: () => number
}

export type ReplicaModule = AppModule & {
  repository: ReplicaRepository
  sync: Syncer
  campuses: CampusesService
  /** Eventos, exámenes y correcciones de 42, bajo demanda. */
  agenda: Agenda
  /** Plan de estudios: el de cada persona y el círculo de cada proyecto. */
  curriculum: Curriculum
  /** La cuota de 42: quién puede gastarla y la cola de quien espera. */
  quota: Quota
}

export function createReplicaModule(deps: ReplicaModuleDeps): ReplicaModule {
  const repository = createReplicaRepository(deps.db)
  const quota = createQuota({
    db: deps.db,
    client: deps.client,
    hourlyReserve: deps.config.hourlyReserve,
    ...given({ priority: deps.priority, halted: deps.halted, now: deps.now, log: deps.log }),
  })
  const sync = createSyncer({
    client: deps.client,
    replica: repository,
    config: deps.config,
    quota,
    ...given({ now: deps.now, log: deps.log }),
  })
  const campuses = createCampusesService({
    replica: repository,
    sync,
    trackedCampusIds: deps.config.trackedCampusIds,
  })

  const agenda = createAgenda({
    db: deps.db,
    client: deps.client,
    hourlyReserve: deps.config.hourlyReserve,
    quota,
    ...given({ now: deps.now, log: deps.log }),
  })

  const curriculum = createCurriculum({
    db: deps.db,
    client: deps.client,
    hourlyReserve: deps.config.hourlyReserve,
    quota,
    ...given({ now: deps.now, log: deps.log }),
  })

  const photos = createPhotos({
    db: deps.db,
    client: deps.client,
    store: deps.photos ?? memoryPhotoStore(),
    ...given({ halted: deps.halted, now: deps.now, log: deps.log }),
  })

  // Lo que se hace cuando le llega el turno a quien esperaba: lo mismo que se
  // habría hecho en su visita si hubiera habido cuota.
  quota.register('agenda', async (login) =>
    agenda.userAgenda(login, await repository.userIdOf(login)),
  )
  quota.register('cursus', async (login) =>
    curriculum.cursusOf(login, await repository.userIdOf(login)),
  )
  quota.register('track', async (login) =>
    curriculum.trackOf(login, await repository.userIdOf(login)),
  )

  return {
    name: 'replica',
    personal: [
      // Lo copiado de 42 va marcado como tal: en la descarga se distingue de lo
      // que la app sabe por sí misma (la cola y los votos son de la app).
      { table: 'users', logins: ['login'], source: '42' },
      { table: 'campus_members', userIds: ['user_id'], source: '42' },
      { table: 'project_users', userIds: ['user_id'], source: '42' },
      { table: 'presence', userIds: ['user_id'], source: '42' },
      // La nota es de quien fue corregido; quien corrigió se lleva que corrigió.
      {
        table: 'corrections',
        logins: ['corrector', 'corrected'],
        source: '42',
        give: {
          corrector: ['id', 'campus_id', 'corrector', 'corrected', 'project_id', 'begin_at'],
        },
      },
      { table: 'agenda_users', logins: ['login'], source: '42' },
      { table: 'user_tracks', logins: ['login'], source: '42' },
      { table: 'user_levels', logins: ['login'], source: '42' },
      { table: 'quota_queue', logins: ['login'] },
      { table: 'curriculum_votes', logins: ['login'] },
    ],
    repository,
    agenda,
    curriculum,
    sync,
    campuses,
    quota,
    routes: (app, context) => {
      registerReplicaRoutes(app, context, { campuses, sync, quota, photos })
    },
    jobs: [
      {
        name: 'cola de la cuota de 42',
        everyMs: DRAIN_EVERY_MS,
        run: async () => {
          await quota.drain()
        },
      },
      {
        // Es de toda la base, no solo de la réplica: va aquí porque este módulo
        // es el que más escribe y el que está siempre.
        name: 'estadísticas de la base',
        everyMs: 6 * 60 * 60_000,
        run: () => maintain(deps.db),
      },
    ],
    start: () => {
      if (deps.backgroundSync ?? true) {
        sync.start()
      }
    },
    stop: () => sync.stop(),
  }
}

export type { Agenda } from './agenda.js'
export { FRESH_USER_TTL_MS } from './agenda.js'
export { diskPhotoStore } from './photos.js'
export type { PhotoStore } from './photos.js'
export { LAST_CIRCLE, SEEDED_UP_TO, parseHours } from './curriculum.js'
export { CHOICES } from './common-core.js'
export type { Curriculum } from './curriculum.js'
export { hourlyQuota } from './quota.js'
export type { Quota, QuotaGate } from './quota.js'
export { syncConfigFrom } from './sync-config.js'
export { LOCATION_MAX_AGE_MS } from './replica.domain.js'
export type { ReplicaRepository } from './replica.repository.js'
export type { Syncer, SyncerConfig } from './syncer.js'
