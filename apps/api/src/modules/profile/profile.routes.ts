/**
 * Rutas del expediente: XP, títulos, logros, reacciones y preferencias.
 */

import type { Profile } from '@sanatorio/contracts'
import type { FastifyInstance } from 'fastify'

import type { EventBus } from '../../core/events.js'
import type { RouteContext } from '../../core/module.js'
import type { XpService } from './xp.service.js'

export type ProfileRoutesOptions = {
  xp: XpService
  events: EventBus
}

export function registerProfileRoutes(
  app: FastifyInstance,
  { session }: RouteContext,
  { xp, events }: ProfileRoutesOptions,
): void {
  /** `GET /me/profile` → XP, nivel, títulos, logros, reacciones y preferencias. */
  app.get('/me/profile', async (request, reply) => {
    const actor = await session.actor(request)
    // Antes de sumar: que quien tenga XP pendiente de repartir la reparta.
    await events.emit('profile.viewed', { login: actor.login })

    const profile: Profile = {
      ...(await xp.expediente(actor)),
      homeCampusId: session.homeCampus(session.user(request)),
    }

    return reply.send(profile)
  })

  /** `PUT /me/settings` → `{ campusId?, lang?, title? }`. */
  app.put('/me/settings', async (request, reply) => {
    await xp.updateSettings(await session.actor(request), request.body)

    return reply.code(204).send()
  })

  /** `GET /leaderboard?period=month|all` → quién ayuda más en el campus. */
  app.get<{ Querystring: { period?: string } }>('/leaderboard', async (request, reply) => {
    return reply.send(
      await xp.leaderboard(
        await session.actor(request),
        request.query.period === 'all' ? 'all' : 'month',
      ),
    )
  })
}
