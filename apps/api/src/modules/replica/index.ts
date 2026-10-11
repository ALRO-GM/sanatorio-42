/**
 * Módulo `replica`: la copia local de 42 y quien la mantiene al día.
 *
 * Es la base de todos los demás: ninguno llama a la API de 42, todos leen de
 * aquí. El único que gasta peticiones es el sincronizador.
 */

import type { Db } from '../../core/db/database.js'
import type { AppModule } from '../../core/module.js'
import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import { createAgenda } from './agenda.js'
import type { Agenda } from './agenda.js'
import { createCurriculum } from './curriculum.js'
import type { Curriculum } from './curriculum.js'
import { createCampusesService } from './campuses.service.js'
import type { CampusesService } from './campuses.service.js'
import { createReplicaRepository } from './replica.repository.js'
import type { ReplicaRepository } from './replica.repository.js'
import { registerReplicaRoutes } from './replica.routes.js'
import { createSyncer } from './syncer.js'
import type { Syncer, SyncerConfig } from './syncer.js'

export type ReplicaModuleDeps = {
  db: Db
  client: FortyTwoClient
  config: SyncerConfig
  /** `false` para no arrancar el bucle de fondo aunque se llame a `start`. */
  backgroundSync?: boolean
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
}

export function createReplicaModule(deps: ReplicaModuleDeps): ReplicaModule {
  const repository = createReplicaRepository(deps.db)
  const sync = createSyncer({
    client: deps.client,
    replica: repository,
    config: deps.config,
    ...(deps.now === undefined ? {} : { now: deps.now }),
    ...(deps.log === undefined ? {} : { log: deps.log }),
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
    ...(deps.now === undefined ? {} : { now: deps.now }),
    ...(deps.log === undefined ? {} : { log: deps.log }),
  })

  const curriculum = createCurriculum({
    db: deps.db,
    client: deps.client,
    hourlyReserve: deps.config.hourlyReserve,
    ...(deps.now === undefined ? {} : { now: deps.now }),
    ...(deps.log === undefined ? {} : { log: deps.log }),
  })

  return {
    name: 'replica',
    repository,
    agenda,
    curriculum,
    sync,
    campuses,
    routes: (app, context) => {
      registerReplicaRoutes(app, context, { campuses, sync })
    },
    start: () => {
      if (deps.backgroundSync ?? true) {
        sync.start()
      }
    },
    stop: () => sync.stop(),
  }
}

export type { Agenda, AgendaEvaluation, AgendaEvent, UserAgenda } from './agenda.js'
export { LAST_CIRCLE, parseHours } from './curriculum.js'
export type { Curriculum, Track } from './curriculum.js'
export { syncConfigFrom } from './sync-config.js'
export { LOCATION_MAX_AGE_MS, PROJECT_STATUS } from './replica.domain.js'
export type { ReplicaRepository } from './replica.repository.js'
export type { Syncer, SyncerConfig } from './syncer.js'
