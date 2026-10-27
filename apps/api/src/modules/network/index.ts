/**
 * Módulo `network`: la red de correcciones. Copia de 42 quién ha corregido a
 * quién y calcula sobre eso el grafo y la endogamia.
 */

import type { Db } from '../../core/db/database.js'
import type { Audience } from '../../core/audience.js'
import type { AppModule } from '../../core/module.js'
import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import type { QuotaGate, ReplicaRepository } from '../replica/index.js'
import { createNetworkRepository } from './network.repository.js'
import { registerNetworkRoutes } from './network.routes.js'
import { createNetworkService } from './network.service.js'
import type { NetworkService } from './network.service.js'
import { createSeatingService } from './seating.service.js'
import { createCorrectionSync, PISCINE_CURSUS } from './network.sync.js'
import type { CorrectionSync } from './network.sync.js'
import { given } from '../../core/options.js'

type NetworkModuleDeps = {
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
  /** Quién ve a quién (`docs/piscineros.md`). Sin ella, nadie es piscinero. */
  audience?: Audience
  /** Los piscineros en curso de un campus, con su avatar. */
  poolMembersOf?: (campusId: number) => Promise<Map<string, string | null>>
}

export type NetworkModule = AppModule & {
  service: NetworkService
  sync: CorrectionSync
  /** La copia de las correcciones de la piscina en curso (cursus 9). */
  poolSync: CorrectionSync
  /** Quién corrige más en un campus: lo usan las noticias del juego secreto. */
  topCorrectors: (campusId: number, limit: number) => Promise<string[]>
  /**
   * Con quién se ha corregido más alguien, en los dos sentidos (le corrigió o
   * le corrigieron), los que más primero. Lo usan las noticias del juego secreto.
   */
  partnersOf: (campusId: number, login: string, limit: number) => Promise<string[]>
  /** Correcciones hechas por alguien, por proyecto. */
  correctedByProject: (login: string) => Promise<Map<number, number>>
  /** Proyectos corregidos en un campus desde una fecha (ISO). */
  correctedSince: (campusId: number, since: string) => Promise<Set<number>>
}

/** Cada cuánto avanza la copia. Con el histórico hecho, casi todas las vueltas no piden nada. */
const SYNC_EVERY_MS = 20_000

/**
 * Hasta dónde mira atrás la copia de la piscina. Un piscinero lo es durante
 * 60 días desde que empieza (`docs/piscineros.md`); con 90 cabe su piscina
 * entera y lo anterior, de piscinas ya terminadas, no se pide.
 */
const POOL_RECENT_MS = 90 * 24 * 60 * 60_000

export function createNetworkModule(deps: NetworkModuleDeps): NetworkModule {
  const corrections = createNetworkRepository(deps.db)
  const clock = deps.now === undefined ? {} : { now: deps.now }
  const common = {
    client: deps.client,
    corrections,
    replica: deps.replica,
    campusIds: deps.campusIds,
    hourlyReserve: deps.hourlyReserve,
    ...given({ quota: deps.quota, isActive: deps.isActive, log: deps.log }),
    ...clock,
  }
  const sync = createCorrectionSync(common)
  // Va aparte, con su propio estado (`corrections:9:<campus>`): solo trae las
  // novedades de los últimos `POOL_RECENT_MS`, sin histórico ni repaso.
  const poolSync = createCorrectionSync({
    ...common,
    cursus: PISCINE_CURSUS,
    recentMs: POOL_RECENT_MS,
  })
  const service = createNetworkService({
    corrections,
    replica: deps.replica,
    sync,
    poolSync,
    ...given({ audience: deps.audience, poolMembersOf: deps.poolMembersOf }),
    ...clock,
  })
  const seating = createSeatingService({
    db: deps.db,
    knownSeats: (campusId) => deps.replica.knownSeats(campusId),
    ...given({ audience: deps.audience }),
    ...clock,
  })

  return {
    name: 'network',
    service,
    sync,
    poolSync,
    topCorrectors: (campusId, limit) => corrections.topCorrectors(campusId, limit),
    partnersOf: async (campusId, login, limit) =>
      (await corrections.partnersOf(campusId, login)).slice(0, limit).map((entry) => entry.login),
    correctedByProject: (login) => corrections.correctedByProject(login),
    correctedSince: (campusId, since) => corrections.correctedSince(campusId, since),
    routes: (app, context) => {
      registerNetworkRoutes(app, context, service, seating)
    },
    jobs: [
      {
        name: 'copia de correcciones',
        usage: 'corrections',
        everyMs: SYNC_EVERY_MS,
        run: () => sync.step(),
      },
      {
        name: 'copia de correcciones de la piscina',
        usage: 'pool-corrections',
        everyMs: SYNC_EVERY_MS,
        run: () => poolSync.step(),
      },
    ],
  }
}

export type { NetworkService } from './network.service.js'
export type { CorrectionSync } from './network.sync.js'
