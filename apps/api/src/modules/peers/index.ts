/**
 * Módulo `peers`: la consulta. Tus proyectos, quién puede ayudarte y tu guardia.
 */

import type { Db } from '../../core/db/database.js'
import type { EventBus } from '../../core/events.js'
import type { AppModule } from '../../core/module.js'
import type { ReplicaRepository, Syncer } from '../replica/index.js'
import { createAvailabilityRepository } from './availability.repository.js'
import type { AvailabilityRepository } from './availability.repository.js'
import { createAvailabilityService } from './availability.service.js'
import type { AvailabilityService } from './availability.service.js'
import { registerPeersRoutes } from './peers.routes.js'
import { createPeersService } from './peers.service.js'
import type { PeersService } from './peers.service.js'

type PeersModuleDeps = {
  db: Db
  replica: ReplicaRepository
  sync: Syncer
  events: EventBus
  now?: () => number
}

export type PeersModule = AppModule & {
  peers: PeersService
  availability: AvailabilityService
  availabilityRepository: AvailabilityRepository
}

export function createPeersModule(deps: PeersModuleDeps): PeersModule {
  const availabilityRepository = createAvailabilityRepository(deps.db)
  const availability = createAvailabilityService(availabilityRepository)
  const peers = createPeersService({
    replica: deps.replica,
    sync: deps.sync,
    ...(deps.now === undefined ? {} : { now: deps.now }),
  })

  return {
    name: 'peers',
    personal: [{ table: 'availability', logins: ['login'] }],
    peers,
    availability,
    availabilityRepository,
    routes: (app, context) => {
      registerPeersRoutes(app, context, { peers, availability, events: deps.events })
    },
  }
}

export type { PeersService } from './peers.service.js'
