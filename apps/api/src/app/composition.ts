/**
 * Composición: qué módulos hay y qué recibe cada uno.
 *
 * Es el único sitio que conoce a todos los módulos. Lo usan el servidor, los
 * comandos de `cli/` y los tests, así que no hay dos formas distintas de montar
 * la aplicación.
 *
 * Para añadir una funcionalidad: crear su carpeta en `modules/`, construirla
 * aquí con lo que necesite y añadirla a `modules`.
 */

import type { Db } from '../core/db/database.js'
import { createEventBus } from '../core/events.js'
import type { EventBus } from '../core/events.js'
import type { AppModule } from '../core/module.js'
import type { FortyTwoClient } from '../integrations/forty-two/client.js'
import { createBoardsModule } from '../modules/boards/index.js'
import type { BoardsModule } from '../modules/boards/index.js'
import { createCalendarModule } from '../modules/calendar/index.js'
import type { CalendarModule } from '../modules/calendar/index.js'
import { createDoubtsModule } from '../modules/doubts/index.js'
import type { DoubtsModule } from '../modules/doubts/index.js'
import { createHelpModule } from '../modules/help/index.js'
import type { HelpModule } from '../modules/help/index.js'
import { createMapModule } from '../modules/map/index.js'
import type { MapModule } from '../modules/map/index.js'
import { createNetworkModule } from '../modules/network/index.js'
import type { NetworkModule } from '../modules/network/index.js'
import { createPeersModule } from '../modules/peers/index.js'
import type { PeersModule } from '../modules/peers/index.js'
import { createProfileModule } from '../modules/profile/index.js'
import type { ProfileModule } from '../modules/profile/index.js'
import { createReplicaModule } from '../modules/replica/index.js'
import type { ReplicaModule, SyncerConfig } from '../modules/replica/index.js'
import { createTherapyModule } from '../modules/therapy/index.js'
import type { TherapyModule } from '../modules/therapy/index.js'

export type CompositionConfig = {
  sync: SyncerConfig
  /** `false` para que `start()` no arranque el bucle de sincronización. */
  backgroundSync?: boolean
  /** Rastro de la sincronización y de los fallos de la 42. */
  log?: (message: string) => void
  /** Reloj inyectable, para los tests. */
  now?: () => number
}

/** Los servicios de todos los módulos, a mano para los tests y los comandos. */
export type Services = {
  repositories: {
    availability: PeersModule['availabilityRepository']
    replica: ReplicaModule['repository']
    profiles: ProfileModule['profiles']
  }
  sync: ReplicaModule['sync']
  campuses: ReplicaModule['campuses']
  peers: PeersModule['peers']
  availability: PeersModule['availability']
  xp: ProfileModule['xp']
  therapy: TherapyModule['service']
  doubts: DoubtsModule['service']
  boards: BoardsModule['service']
  map: MapModule['service']
  help: HelpModule['service']
  calendar: CalendarModule['service']
  network: NetworkModule['service']
  corrections: NetworkModule['sync']
}

export type Composition = {
  events: EventBus
  /** En el orden en que se registran sus rutas. */
  modules: AppModule[]
  services: Services
}

/** Monta todos los módulos de negocio sobre una conexión abierta. */
export function compose(db: Db, client: FortyTwoClient, config: CompositionConfig): Composition {
  const events = createEventBus()
  const clock = config.now === undefined ? {} : { now: config.now }

  const replica = createReplicaModule({
    db,
    client,
    config: config.sync,
    ...(config.backgroundSync === undefined ? {} : { backgroundSync: config.backgroundSync }),
    ...(config.log === undefined ? {} : { log: config.log }),
    ...clock,
  })
  const common = { db, replica: replica.repository, ...clock }

  const profile = createProfileModule({ ...common, curriculum: replica.curriculum, events })
  const peers = createPeersModule({ ...common, sync: replica.sync, events })
  const therapy = createTherapyModule({ ...common, sync: replica.sync, xp: profile.xp })
  const doubts = createDoubtsModule({
    ...common,
    curriculum: replica.curriculum,
    xp: profile.xp,
  })
  const boards = createBoardsModule({ ...common, xp: profile.xp, events })
  const map = createMapModule({
    replica: replica.repository,
    sync: replica.sync,
    peers: peers.peers,
    therapy: therapy.service,
    ...clock,
  })

  const help = createHelpModule({
    ...common,
    agenda: replica.agenda,
    sync: replica.sync,
    xp: profile.xp,
  })
  const calendar = createCalendarModule({
    replica: replica.repository,
    agenda: replica.agenda,
    help: help.service,
    therapy: therapy.service,
    boards: boards.service,
  })

  const network = createNetworkModule({
    db,
    client,
    replica: replica.repository,
    campusIds: config.sync.trackedCampusIds,
    hourlyReserve: config.sync.hourlyReserve,
    isActive: () => replica.sync.isActive(),
    ...(config.log === undefined ? {} : { log: config.log }),
    ...clock,
  })

  return {
    events,
    modules: [replica, peers, profile, therapy, doubts, boards, map, help, calendar, network],
    services: {
      repositories: {
        availability: peers.availabilityRepository,
        replica: replica.repository,
        profiles: profile.profiles,
      },
      sync: replica.sync,
      campuses: replica.campuses,
      peers: peers.peers,
      availability: peers.availability,
      xp: profile.xp,
      therapy: therapy.service,
      doubts: doubts.service,
      boards: boards.service,
      map: map.service,
      help: help.service,
      calendar: calendar.service,
      network: network.service,
      corrections: network.sync,
    },
  }
}
