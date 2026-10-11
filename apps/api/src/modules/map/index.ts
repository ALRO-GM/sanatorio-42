/**
 * Módulo `map`: el mapa de clusters de la sala de espera de cada proyecto.
 *
 * No tiene tablas: compone lo que saben `replica`, `peers` y `therapy`.
 */

import type { AppModule } from '../../core/module.js'
import type { PeersService } from '../peers/index.js'
import type { ReplicaRepository, Syncer } from '../replica/index.js'
import type { TherapyService } from '../therapy/index.js'
import { registerMapRoutes } from './map.routes.js'
import { createMapService } from './map.service.js'
import type { MapService } from './map.service.js'

export type MapModuleDeps = {
  replica: ReplicaRepository
  sync: Syncer
  peers: PeersService
  therapy: TherapyService
  now?: () => number
}

export type MapModule = AppModule & { service: MapService }

export function createMapModule(deps: MapModuleDeps): MapModule {
  const service = createMapService(deps)

  return {
    name: 'map',
    service,
    routes: (app, context) => {
      registerMapRoutes(app, context, service)
    },
  }
}

export { hostAt, parseHost } from './seat-layout.js'
export type { MapService } from './map.service.js'
