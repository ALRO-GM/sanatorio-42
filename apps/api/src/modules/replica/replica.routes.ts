/**
 * Rutas de la réplica: catálogo de campus y estado de la sincronización.
 */

import type { FastifyInstance } from 'fastify'

import type { RouteContext } from '../../core/module.js'
import type { CampusesService } from './campuses.service.js'
import type { Syncer } from './syncer.js'

export type ReplicaRoutesOptions = {
  campuses: CampusesService
  sync: Syncer
}

export function registerReplicaRoutes(
  app: FastifyInstance,
  { session }: RouteContext,
  { campuses, sync }: ReplicaRoutesOptions,
): void {
  /** `GET /campuses` → catálogo de campus, para el selector. */
  app.get('/campuses', async (request, reply) => {
    session.user(request)

    return reply.send(await campuses.list())
  })

  /**
   * `GET /sync/status` → cómo va la réplica.
   *
   * Cuánto se ha copiado, cuándo fue la última foto de puestos y cuánta cuota
   * queda. Es lo que mira el pie de la web para decir "datos de hace 2 min".
   */
  app.get('/sync/status', async (request, reply) => {
    session.user(request)

    return reply.send(await sync.status())
  })
}
