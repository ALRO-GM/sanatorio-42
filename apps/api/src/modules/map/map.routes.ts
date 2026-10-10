/**
 * Rutas del mapa de clusters.
 */

import type { FastifyInstance } from 'fastify'

import { idParam } from '../../core/http/params.js'
import type { IdParams } from '../../core/http/params.js'
import type { RouteContext } from '../../core/module.js'
import type { MapService } from './map.service.js'

export function registerMapRoutes(
  app: FastifyInstance,
  { session }: RouteContext,
  map: MapService,
): void {
  /**
   * `GET /projects/:id/map` → los clusters del campus que se mira, con quién
   * ocupa cada puesto, quién está de guardia para ese proyecto y qué puestos
   * están reservados por un grupo de terapia.
   */
  app.get<IdParams>('/projects/:id/map', async (request, reply) => {
    const actor = await session.actor(request)

    // Depende de quién pregunta (`me`) y cambia cada pocos minutos.
    reply.header('Cache-Control', 'private, no-store')

    return reply.send(await map.forCampus(actor, idParam(request.params.id, 'El proyecto')))
  })

  /**
   * `GET /map` → el mismo plano sin proyecto: ocupación y reservas, sin nadie
   * resaltado. Es el que se usa para elegir puestos al abrir un grupo de terapia.
   */
  app.get('/map', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store')

    return reply.send(await map.forCampus(await session.actor(request)))
  })
}
