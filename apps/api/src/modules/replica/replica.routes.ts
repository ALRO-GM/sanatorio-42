/**
 * Rutas de la réplica: catálogo de campus y estado de la sincronización.
 */

import { assertAdmin } from '../../core/actor.js'
import type { FastifyInstance } from 'fastify'

import type { RouteContext } from '../../core/module.js'
import type { CampusesService } from './campuses.service.js'
import type { Quota } from './quota.js'
import type { Syncer } from './syncer.js'

export type ReplicaRoutesOptions = {
  campuses: CampusesService
  sync: Syncer
  quota: Quota
}

export function registerReplicaRoutes(
  app: FastifyInstance,
  { session }: RouteContext,
  { campuses, sync, quota }: ReplicaRoutesOptions,
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

  /**
   * `GET /quota` → si la cuota de 42 va justa y, si te toca esperar, tu turno.
   *
   * Es lo que mira el rótulo de aviso y el tique de la sala de espera.
   */
  app.get('/quota', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store')

    return reply.send(await quota.statusFor(session.user(request).login))
  })

  /** `GET /admin/quota` → la cuota de 42, para el panel. Solo admins. */
  app.get('/admin/quota', async (request, reply) => {
    assertAdmin(await session.actor(request))

    return reply.send(await quota.status())
  })

  /** `PUT /admin/quota` → los ajustes de la cuota de 42 que cambian; devuelve cómo queda. */
  app.put('/admin/quota', async (request, reply) => {
    const actor = await session.actor(request)

    assertAdmin(actor)

    return reply.send(await quota.configure(request.body, actor.login))
  })
}
