/**
 * Rutas de la red de correcciones.
 */

import type { FastifyInstance } from 'fastify'

import type { RouteContext } from '../../core/module.js'
import type { NetworkService } from './network.service.js'

export function registerNetworkRoutes(
  app: FastifyInstance,
  { session }: RouteContext,
  network: NetworkService,
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

  /** `GET /network/people?q=` → logins que empiezan así, los más activos primero. */
  app.get<{ Querystring: { q?: string } }>('/network/people', async (request, reply) => {
    return reply.send(await network.people(await session.actor(request), request.query.q))
  })
}
