/**
 * Módulo `admin`: permisos, bloqueos, buzón y consumo.
 *
 * Además de sus rutas, cuelga dos ganchos de todas las peticiones con sesión:
 * uno antes, que corta a las cuentas bloqueadas y aplica el tope de uso, y otro
 * después, que apunta lo servido. Por eso tiene que registrarse antes que los
 * demás módulos.
 */

import type { FastifyRequest } from 'fastify'

import type { AppModule } from '../../core/module.js'
import type { SessionReader } from '../../core/session.js'
import { createAdminService } from './admin.service.js'
import type { AdminService, AdminServiceOptions } from './admin.service.js'

export type AdminModule = AppModule & { service: AdminService }

/** Login de la sesión, o `null` si la petición no trae una válida. */
function loginOf(session: SessionReader, request: FastifyRequest): string | null {
  try {
    return session.user(request).login
  } catch {
    return null
  }
}

export function createAdminModule(deps: AdminServiceOptions): AdminModule {
  const service = createAdminService(deps)

  return {
    name: 'admin',
    service,
    routes: (app, { session }) => {
      // --- Consumo: tope antes de servir, cuenta después ----------------------
      app.addHook('onRequest', async (request, reply) => {
        const who = loginOf(session, request)

        if (who === null) return

        const { admin, block } = await service.accessOf(who)

        // Una cuenta bloqueada no pasa por ninguna ruta, pida o no el "actor".
        // Solo le quedan las de sesión, para saber que lo está y poder salir.
        if (block !== null && !request.url.startsWith('/auth/')) {
          await reply.code(403).send({
            error: 'forbidden',
            message: `Tu cuenta está bloqueada: ${block.reason}`,
          })

          return
        }

        if (!(await service.allow(who, admin))) {
          await reply.code(429).header('Retry-After', '600').send({
            error: 'rate_limited',
            message:
              'Has usado la web más de lo que toca esta hora. Vuelve en unos minutos: el tope se reparte entre todos.',
          })
        }
      })
      app.addHook('onResponse', (request, reply, done) => {
        const who = loginOf(session, request)

        if (who !== null && reply.statusCode !== 429) {
          service.count(who, Number(reply.getHeader('content-length') ?? 0) || 0)
        }

        done()
      })

      // --- Buzón de la gente ---------------------------------------------------
      /** `POST /tickets` → manda una incidencia, una sugerencia o una denuncia. */
      app.post('/tickets', async (request, reply) => {
        return reply
          .code(201)
          .send(await service.openTicket(await session.actor(request), request.body))
      })

      /** `GET /tickets/mine` → lo que has mandado, con sus respuestas. */
      app.get('/tickets/mine', async (request, reply) => {
        return reply.send(await service.myTickets(await session.actor(request)))
      })

      // --- Panel (solo admins) -------------------------------------------------
      /** `GET /admin/consumption` → uso por horas, patrón semanal, avisos y quién más consume. */
      app.get('/admin/consumption', async (request, reply) => {
        return reply.send(await service.consumption(await session.actor(request)))
      })

      /** `GET /admin/people` → admins, cuentas bloqueadas y topes a mano. */
      app.get('/admin/people', async (request, reply) => {
        return reply.send(await service.people(await session.actor(request)))
      })

      /** `PUT /admin/roles` → `{ login, admin }`. 204. */
      app.put('/admin/roles', async (request, reply) => {
        await service.setRole(await session.actor(request), request.body)

        return reply.code(204).send()
      })

      /** `PUT /admin/blocks` → `{ login, reason, days? }`. 204. */
      app.put('/admin/blocks', async (request, reply) => {
        await service.block(await session.actor(request), request.body)

        return reply.code(204).send()
      })

      /** `DELETE /admin/blocks/:login` → 204. */
      app.delete<{ Params: { login: string } }>('/admin/blocks/:login', async (request, reply) => {
        await service.unblock(await session.actor(request), request.params.login)

        return reply.code(204).send()
      })

      /** `PUT /admin/limits` → `{ login, perHour }` (`null` vuelve al automático). 204. */
      app.put('/admin/limits', async (request, reply) => {
        await service.setLimit(await session.actor(request), request.body)

        return reply.code(204).send()
      })

      /** `PUT /admin/budget` → los ajustes del presupuesto que cambian; devuelve cómo queda. */
      app.put('/admin/budget', async (request, reply) => {
        return reply.send(await service.setBudget(await session.actor(request), request.body))
      })

      /** `GET /admin/tickets` → el buzón entero, lo pendiente primero. */
      app.get('/admin/tickets', async (request, reply) => {
        return reply.send(await service.tickets(await session.actor(request)))
      })

      /** `POST /admin/tickets/:id/answer` → `{ answer, status? }`. */
      app.post<{ Params: { id: string } }>('/admin/tickets/:id/answer', async (request, reply) => {
        return reply.send(
          await service.answerTicket(
            await session.actor(request),
            Number(request.params.id),
            request.body,
          ),
        )
      })
    },
    jobs: [
      {
        name: 'volcado del consumo',
        everyMs: 60_000,
        run: () => service.flush(),
      },
    ],
  }
}

export type { AdminService } from './admin.service.js'
