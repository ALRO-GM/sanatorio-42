/**
 * Rutas de la red de correcciones.
 */

import type { FastifyInstance } from 'fastify'

import { assertAdmin } from '../../core/actor.js'
import type { RouteContext } from '../../core/module.js'
import type { NetworkService } from './network.service.js'
import type { SeatWeightsStore } from './seat-weights.js'
import type { SeatingService } from './seating.service.js'

export function registerNetworkRoutes(
  app: FastifyInstance,
  { session }: RouteContext,
  network: NetworkService,
  seating: SeatingService,
  weights: SeatWeightsStore,
): void {
  /**
   * `GET /network?from=&to=&login=&projectId=&min=&limit=` → quién ha corregido
   * a quién en el campus que miras, con la endogamia de cada persona y del campus.
   */
  app.get<{ Querystring: Record<string, string | undefined> }>(
    '/network',
    async (request, reply) => {
      reply.header('Cache-Control', 'private, max-age=30')

      return reply.send(await network.graph(await session.actor(request), request.query))
    },
  )

  /**
   * `GET /network/pair?a=&b=&from=&to=&projectId=` → las correcciones que se
   * han hecho dos personas, las últimas primero.
   */
  app.get<{ Querystring: Record<string, string | undefined> }>(
    '/network/pair',
    async (request, reply) => {
      return reply.send(await network.pair(await session.actor(request), request.query))
    },
  )

  /**
   * `GET /network/strictest?min=&from=&to=&projectId=` → quién suspende más de
   * lo que evalúa, entre quienes han evaluado al menos `min` proyectos.
   */
  app.get<{ Querystring: Record<string, string | undefined> }>(
    '/network/strictest',
    async (request, reply) => {
      reply.header('Cache-Control', 'private, max-age=30')

      return reply.send(await network.strictest(await session.actor(request), request.query))
    },
  )

  /**
   * `GET /network/seats?days=` → la red de asientos: quién se sienta cerca de
   * quién en los clústeres, en los últimos `days` días (`docs/asientos.md`).
   */
  app.get<{ Querystring: Record<string, string | undefined> }>(
    '/network/seats',
    async (request, reply) => {
      reply.header('Cache-Control', 'private, max-age=60')

      return reply.send(await seating.graph(await session.actor(request), request.query))
    },
  )

  /**
   * `GET /network/seats/heat?days=` → el mapa de calor de los puestos: horas y
   * gente distinta en cada ordenador de los clústeres, sin nombres.
   */
  app.get<{ Querystring: Record<string, string | undefined> }>(
    '/network/seats/heat',
    async (request, reply) => {
      reply.header('Cache-Control', 'private, max-age=60')

      return reply.send(await seating.heat(await session.actor(request), request.query))
    },
  )

  /**
   * `GET /admin/seat-weights` → los pesos de los puestos en uso, los de
   * siempre y quién los cambió. `PUT` con `{ grid }` los guarda: la red de
   * asientos se recalcula con ellos (`docs/asientos.md`).
   */
  app.get('/admin/seat-weights', async (request, reply) => {
    const actor = await session.actor(request)

    assertAdmin(actor)

    return reply.send(await weights.current())
  })

  app.put('/admin/seat-weights', async (request, reply) => {
    return reply.send(await weights.set(await session.actor(request), request.body))
  })

  /**
   * `POST /admin/seat-weights/preview` con `{ grid, days | from, to }` → cómo
   * saldría la red de asientos con esos pesos, sin guardarlos, y lo bien que
   * separa en grupos al lado de los pesos en uso.
   */
  app.post('/admin/seat-weights/preview', async (request, reply) => {
    return reply.send(await seating.preview(await session.actor(request), request.body))
  })

  /** `GET /network/mine` → con quién te has corregido tú, en todo el histórico. */
  app.get('/network/mine', async (request, reply) => {
    reply.header('Cache-Control', 'private, max-age=60')

    return reply.send(await network.mine(await session.actor(request)))
  })

  /** `GET /network/people?q=&campuses=` → logins que empiezan así, los más activos primero. */
  app.get<{ Querystring: { q?: string; campuses?: string } }>(
    '/network/people',
    async (request, reply) => {
      return reply.send(
        await network.people(await session.actor(request), request.query.q, request.query.campuses),
      )
    },
  )
}
