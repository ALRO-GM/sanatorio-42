/**
 * Rutas del expediente: XP, títulos, logros, reacciones y preferencias.
 */

import type { Profile } from '@sanatorio/contracts'
import type { FastifyInstance } from 'fastify'

import type { EventBus } from '../../core/events.js'
import type { RouteContext } from '../../core/module.js'
import type { XpService } from './xp.service.js'

type ProfileRoutesOptions = {
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

  /**
   * `GET /me/unlocks` → `Unlocks`: lo desbloqueado (logros de los cursos,
   * títulos de nivel, maestro) que aún no se ha celebrado en pantalla. Cobra
   * antes la XP de los cursos que falte.
   */
  app.get('/me/unlocks', async (request, reply) => {
    return reply.send(await xp.unlocks(await session.actor(request)))
  })

  /** `POST /me/unlocks/seen` → `{ ids }`: ya celebrados, no vuelven a salir. 204. */
  app.post('/me/unlocks/seen', async (request, reply) => {
    await xp.unlocksSeen(await session.actor(request), request.body)

    return reply.code(204).send()
  })

  /** `PUT /me/settings` → `{ campusId?, lang?, title? }`. */
  app.put('/me/settings', async (request, reply) => {
    await xp.updateSettings(await session.actor(request), request.body)

    return reply.code(204).send()
  })

  /** `GET /users/search?q=` → personas cuyo login o nombre lleva lo escrito. */
  app.get<{ Querystring: { q?: string } }>('/users/search', async (request, reply) => {
    return reply.send(await xp.search(await session.actor(request), request.query.q))
  })

  /** `GET /users/:login/profile` → el expediente público de otra persona. */
  app.get<{ Params: { login: string } }>('/users/:login/profile', async (request, reply) => {
    // Quien mira importa: estudiantes y piscineros no se ven entre sí.
    return reply.send(await xp.publicProfile(await session.actor(request), request.params.login))
  })

  /** `GET /me/health` → fechas para saber cómo vas de tiempo: inicio, círculos completados y black hole. */
  app.get('/me/health', async (request, reply) => {
    return reply.send(await xp.health(await session.actor(request), session.user(request).id))
  })

  /** `PUT /me/health/pace` → `{ pace, deadline }`: el pace y el plazo que ves en tu perfil de la intra. */
  app.put('/me/health/pace', async (request, reply) => {
    return reply.send(
      await xp.declarePace(await session.actor(request), session.user(request).id, request.body),
    )
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
