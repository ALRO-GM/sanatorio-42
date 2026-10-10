/**
 * Rutas de la consulta: tus proyectos, quién puede ayudarte y tu guardia.
 *
 * Todas exigen sesión. Ninguna espera a una sincronización completa: leen de la
 * réplica local y, como mucho, provocan las pocas llamadas a 42 que hacen falta
 * para esa pantalla (ver `replica/syncer.ts`, `ensureFresh`).
 */

import type { FastifyInstance } from 'fastify'

import type { EventBus } from '../../core/events.js'
import { idParam } from '../../core/http/params.js'
import type { IdParams } from '../../core/http/params.js'
import type { RouteContext } from '../../core/module.js'
import type { AvailabilityService } from './availability.service.js'
import type { PeersService } from './peers.service.js'

export type PeersRoutesOptions = {
  peers: PeersService
  availability: AvailabilityService
  events: EventBus
}

export function registerPeersRoutes(
  app: FastifyInstance,
  { session }: RouteContext,
  { peers, availability, events }: PeersRoutesOptions,
): void {
  /**
   * `GET /me/projects` → los proyectos en curso.
   *
   * Con `?scope=all`, también los aprobados, cada uno con su `status`: son los
   * proyectos en los que la persona puede responder como especialista.
   *
   * Lista vacía si no tiene ninguno: no es un error, es que no le toca.
   */
  app.get<{ Querystring: { scope?: string } }>('/me/projects', async (request, reply) => {
    const user = session.user(request)

    return reply.send(await peers.findByUser(user, request.query.scope === 'all'))
  })

  /**
   * `GET /projects/:id/peers` → quién puede ayudar, en el campus que se mira.
   *
   * Devuelve solo los accionables (de guardia o en curso) y el resto va en
   * cabeceras, porque mandarle cientos de personas al navegador para que
   * dibuje 60 no tiene sentido:
   *
   * | Cabecera              | Qué es                                              |
   * |-----------------------|-----------------------------------------------------|
   * | `X-Total-Participants`| Personas del campus con ese proyecto.               |
   * | `X-Peers-Returned`    | Cuántas vienen en esta respuesta.                   |
   * | `X-Partial`           | `true` si aún faltan participantes por copiar.      |
   *
   * `X-Partial` solo sale `true` la primera vez que se abre un proyecto grande
   * en un campus que todavía se está copiando.
   */
  app.get<IdParams>('/projects/:id/peers', async (request, reply) => {
    const actor = await session.actor(request)
    const result = await peers.findPeers(
      idParam(request.params.id, 'El proyecto'),
      actor.campusId,
      actor.login,
    )

    reply.header('X-Total-Participants', String(result.totalParticipants))
    reply.header('X-Peers-Returned', String(result.peers.length))
    reply.header('X-Partial', result.complete ? 'false' : 'true')
    // La respuesta depende de quién pregunta y de quién está de guardia, así que
    // no puede cachearla ningún intermediario. `Cache-Control` y no `Vary`:
    // `Vary` lo usa ya el hook de CORS con `Origin`.
    reply.header('Cache-Control', 'private, no-store')

    return reply.send(result.peers)
  })

  /**
   * `PUT /me/availability` → marcarte como disponible.
   *
   * No toca la API de 42: "de guardia" es un dato nuestro, no existe en 42.
   */
  app.put<{ Body: { available?: unknown } | undefined }>(
    '/me/availability',
    async (request, reply) => {
      const user = session.user(request)
      const result = await availability.set(user.login, request.body?.available)

      if (result.available) {
        await events.emit('duty.started', { login: user.login })
      }

      return reply.send(result)
    },
  )

  /**
   * `GET /me/availability` → tu disponibilidad guardada.
   *
   * Devolver `false` es mejor que un 404: quien acaba de llegar y no ha tocado
   * nada no ha hecho nada malo.
   */
  app.get('/me/availability', async (request, reply) => {
    const user = session.user(request)

    return reply.send(await availability.get(user.login))
  })
}
