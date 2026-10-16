/**
 * Módulo `network`: la red de correcciones. Copia de 42 quién ha corregido a
 * quién y calcula sobre eso el grafo y la endogamia.
 */

import type { Db } from '../../core/db/database.js'
import type { AppModule } from '../../core/module.js'
import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import type { QuotaGate, ReplicaRepository } from '../replica/index.js'
import { createNetworkRepository } from './network.repository.js'
import { registerNetworkRoutes } from './network.routes.js'
import { createNetworkService } from './network.service.js'
import type { NetworkService } from './network.service.js'
import { createCorrectionSync } from './network.sync.js'
import type { CorrectionSync } from './network.sync.js'

export type NetworkModuleDeps = {
  db: Db
  client: FortyTwoClient
  replica: ReplicaRepository
  /** Campus de los que se copian las correcciones. */
  campusIds: readonly number[]
  hourlyReserve: number
  quota?: QuotaGate
  /** `true` si alguien está usando la web: el repaso completo espera. */
  isActive?: () => boolean
  log?: (message: string) => void
  now?: () => number
}

export type NetworkModule = AppModule & {
  service: NetworkService
  sync: CorrectionSync /** Quién corrige más en un campus: lo usan las noticias del juego secreto. */
  topCorrectors: (campusId: number, limit: number) => Promise<string[]>
  /** Correcciones hechas por alguien, por proyecto. */
  correctedByProject: (login: string) => Promise<Map<number, number>>
  /** Proyectos corregidos en un campus desde una fecha (ISO). */
  correctedSince: (campusId: number, since: string) => Promise<Set<number>>
}

/** Cada cuánto avanza la copia. Con el histórico hecho, casi todas las vueltas no piden nada. */
const SYNC_EVERY_MS = 20_000

export function createNetworkModule(deps: NetworkModuleDeps): NetworkModule {
  const corrections = createNetworkRepository(deps.db)
  const clock = deps.now === undefined ? {} : { now: deps.now }
  const sync = createCorrectionSync({
    client: deps.client,
    corrections,
    replica: deps.replica,
    campusIds: deps.campusIds,
    hourlyReserve: deps.hourlyReserve,
    ...(deps.quota === undefined ? {} : { quota: deps.quota }),
    ...(deps.isActive === undefined ? {} : { isActive: deps.isActive }),
    ...(deps.log === undefined ? {} : { log: deps.log }),
    ...clock,
  })
  const service = createNetworkService({ corrections, replica: deps.replica, sync, ...clock })

  return {
    name: 'network',
    service,
    sync,
    topCorrectors: (campusId, limit) => corrections.topCorrectors(campusId, limit),
    correctedByProject: (login) => corrections.correctedByProject(login),
    correctedSince: (campusId, since) => corrections.correctedSince(campusId, since),
    routes: (app, context) => {
      registerNetworkRoutes(app, context, service)
    },
    jobs: [
      {
        name: 'copia de correcciones',
        everyMs: SYNC_EVERY_MS,
        run: () => sync.step(),
      },
    ],
  }
}

export type { NetworkService } from './network.service.js'
export type { CorrectionSync } from './network.sync.js'
