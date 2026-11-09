/**
 * Módulo `network`: la red de correcciones. Copia de 42 quién ha corregido a
 * quién y calcula sobre eso el grafo y la endogamia.
 */

import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import type { Audience } from '../../core/audience.js'
import type { AppModule } from '../../core/module.js'
import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import type { QuotaGate, ReplicaRepository } from '../replica/index.js'
import { createNetworkRepository } from './network.repository.js'
import { registerNetworkRoutes } from './network.routes.js'
import { createNetworkService } from './network.service.js'
import type { NetworkService } from './network.service.js'
import { createSeatWeights } from './seat-weights.js'
import { createSeatingService } from './seating.service.js'
import { createSeatUsage } from './seating.usage.js'
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
   * Las amistades más cercanas de alguien: con quien más se ha sentado cerca y
   * más tiempo (la red de asientos). Lo usan las noticias del juego secreto.
   */
  friendsOf: (actor: Actor, limit: number) => Promise<string[]>
  /** Correcciones hechas por alguien, por proyecto (del 42cursus, o del cursus que se diga). */
  correctedByProject: (login: string, cursus?: number) => Promise<Map<number, number>>
  /** Proyectos corregidos en un campus desde una fecha (ISO). */
  correctedSince: (campusId: number, since: string) => Promise<Set<number>>
}

/** Cada cuánto avanza la copia. Con el histórico hecho, casi todas las vueltas no piden nada. */
const SYNC_EVERY_MS = 20_000

/**
 * Cada cuánto se rehace de fondo la red de asientos de entrada. Los cuatro
 * campus son unos 30 s de cálculo: cada 15 minutos es un 3 % de un núcleo, y
 * entre medias se sigue dando lo último (`STALE_MS` de `seating.service.ts`).
 */
const WARM_EVERY_MS = 15 * 60_000

/**
 * Cada cuánto se suma al uso de los puestos (`seat_usage`) lo nuevo: el mapa de
 * calor va por horas y días, así que con una vez por hora basta. La primera
 * vuelta, al arrancar, suma todo el historial que falte.
 */
const USAGE_EVERY_MS = 60 * 60_000

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
  const weights = createSeatWeights({ db: deps.db, ...clock })
  const usage = createSeatUsage({ db: deps.db, ...given({ log: deps.log }), ...clock })
  const seating = createSeatingService({
    db: deps.db,
    weights,
    usage,
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
    friendsOf: (actor, limit) => seating.friendsOf(actor, limit),
    correctedByProject: (login, cursus) => corrections.correctedByProject(login, cursus),
    correctedSince: (campusId, since) => corrections.correctedSince(campusId, since),
    routes: (app, context) => {
      registerNetworkRoutes(app, context, service, seating, weights)
    },
    // El uso sumado de los puestos lleva login: sale con los datos de cada cual.
    // La primera suma al arrancar, sin esperar la hora: tras un despliegue
    // solo falta lo de mientras estaba parada.
    start: () => {
      usage
        .step()
        .then(() => seating.warmHeat(deps.campusIds))
        .catch((error: unknown) => {
          deps.log?.(
            `uso de los puestos: ${error instanceof Error ? error.message : String(error)}`,
          )
        })
    },
    personal: [{ table: 'seat_usage', logins: ['login'], source: '42' }],
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
      {
        // El mapa de calor de Clústeres lee de aquí (`seating.usage.ts`). Solo
        // suma lo que ha cambiado desde la última vuelta.
        name: 'uso de los puestos',
        everyMs: USAGE_EVERY_MS,
        run: async () => {
          await usage.step()
          await seating.warmHeat(deps.campusIds)
        },
      },
      {
        // La vista de entrada de Amigos («todo») lleva segundos: se deja hecha
        // de fondo para que nadie la espere (`docs/asientos.md`). Solo lee la base.
        name: 'red de asientos precalculada',
        everyMs: WARM_EVERY_MS,
        run: () => seating.warm(deps.campusIds),
      },
    ],
  }
}

export type { NetworkService } from './network.service.js'
export type { CorrectionSync } from './network.sync.js'
export { PISCINE_CURSUS } from './network.sync.js'
// El abandono de la piscina (`stats/dropout.service.ts`) mide el aislamiento como la red de asientos.
export { seatingOf } from './seating.rules.js'
export type { SeatSession } from './seating.rules.js'
export { seatSessionsIn } from './seating.sessions.js'
