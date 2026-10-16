/**
 * Módulo `admin`: permisos, bloqueos, buzón y consumo.
 *
 * Además de sus rutas, cuelga dos ganchos de todas las peticiones con sesión:
 * uno antes, que corta a las cuentas bloqueadas y aplica el tope de uso, y otro
 * después, que apunta lo servido. Por eso tiene que registrarse antes que los
 * demás módulos.
 */

import type { FastifyRequest } from 'fastify'

import { tableStore } from '../../core/db/data-store.js'
import { idParam } from '../../core/http/params.js'
import type { AppModule } from '../../core/module.js'
import type { SessionReader } from '../../core/session.js'
import { ANONYMOUS, createAdminService } from './admin.service.js'
import { RESPONSE_OVERHEAD_BYTES } from './budget.rules.js'
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

/** `true` si la petición trae una sesión de staff. */
function isStaff(session: SessionReader, request: FastifyRequest): boolean {
  try {
    session.staff(request)

    return true
  } catch {
    return false
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
        // Reglas del plan. Al 90 % del tráfico del mes solo entra quien
        // administra (y las rutas de sesión, para que pueda identificarse); al
        // 95 %, nadie. Siempre queda la comprobación de salud, que es lo que
        // mira Caddy y no pesa nada.
        const level = request.url.startsWith('/health') ? 'ok' : await service.level()
        const session_ = level === 'admin_only' ? loginOf(session, request) : null
        const passes =
          level === 'ok' ||
          (level === 'admin_only' &&
            (request.url.startsWith('/auth/') ||
              (session_ !== null && (await service.accessOf(session_)).admin)))

        if (!passes) {
          const renews = service.renewsAt()

          await reply
            .code(503)
            .header(
              'Retry-After',
              String(Math.max(60, Math.ceil((Date.parse(renews) - Date.now()) / 1000))),
            )
            .send({
              error: 'service_stopped',
              message: `Sanatorio 42 está parado hasta el ${renews.slice(0, 10)}: se ha llegado al tope de tráfico del mes.`,
            })

          return
        }

        const who = loginOf(session, request)
        const path = request.url.split('?')[0] ?? ''

        // Una sesión de staff solo llega a lo suyo. Cada ruta de la gente ya la
        // rechaza al leer la sesión; esto cubre también las que no la leen. Lo
        // que no es una ruta de la API (la propia web, sus ficheros) sí pasa:
        // es lo mismo que ve cualquiera sin sesión.
        if (
          isStaff(session, request) &&
          !request.is404 &&
          !path.startsWith('/auth/') &&
          !path.startsWith('/staff/') &&
          !path.startsWith('/health')
        ) {
          await reply.code(403).send({
            error: 'forbidden',
            message: 'Esta cuenta solo sirve para validar documentos',
          })

          return
        }

        // Todo lo que cuelga de `/admin` es de quien administra. Cada servicio
        // lo comprueba también por su cuenta; esto es la segunda cerradura, para
        // que una ruta nueva a la que se le olvide no quede abierta.
        const adminOnly = path === '/admin' || path.startsWith('/admin/')

        if (who === null) {
          if (adminOnly) {
            await reply
              .code(401)
              .send({ error: 'unauthenticated', message: 'No hay sesión iniciada' })
          }

          return
        }

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

        if (adminOnly && !admin) {
          await reply.code(403).send({
            error: 'forbidden',
            message: 'Solo para quien administra la web',
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
      // Lo que devuelve la API es de quien lo pide: ni el navegador ni nada
      // intermedio lo guarda, salvo que la ruta diga otra cosa (lo que es igual
      // para todo el mundo lleva su propio `Cache-Control`).
      app.addHook('onSend', (_request, reply, payload, done) => {
        if (reply.getHeader('cache-control') === undefined) {
          reply.header('Cache-Control', 'private, no-store')
        }

        done(null, payload)
      })
      app.addHook('onResponse', (request, reply, done) => {
        // Se cuenta todo lo que sale, también lo rechazado y lo que no tiene
        // sesión: es tráfico de salida igual, y es lo que tiene límite.
        service.count(
          loginOf(session, request) ?? ANONYMOUS,
          (Number(reply.getHeader('content-length') ?? 0) || 0) + RESPONSE_OVERHEAD_BYTES,
        )

        done()
      })

      // --- Buzón de la gente ---------------------------------------------------
      /** `POST /tickets` → manda una incidencia, una sugerencia o una denuncia. */
      app.post('/tickets', async (request, reply) => {
        return reply
          .code(201)
          .send(await service.openTicket(await session.actor(request), request.body))
      })

      /** `DELETE /tickets/:id` → retira un mensaje tuyo, si aún se puede. 204. */
      app.delete<{ Params: { id: string } }>('/tickets/:id', async (request, reply) => {
        await service.withdrawTicket(
          await session.actor(request),
          idParam(request.params.id, 'El mensaje'),
        )

        return reply.code(204).send()
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

      /** `GET /admin/data` → los tipos de dato que se pueden borrar y cuántas filas tienen. */
      app.get('/admin/data', async (request, reply) => {
        reply.header('Cache-Control', 'private, no-store')

        return reply.send(await service.data(await session.actor(request)))
      })

      /** `POST /admin/data/count` → `{ kind, login?, before?, from? }`: cuántas filas son. */
      app.post('/admin/data/count', async (request, reply) => {
        return reply.send(await service.wipe(await session.actor(request), request.body, false))
      })

      /** `POST /admin/data/preview` → cuántas son y una muestra de las más recientes. */
      app.post('/admin/data/preview', async (request, reply) => {
        return reply.send(await service.preview(await session.actor(request), request.body))
      })

      /** `POST /admin/data/delete` → lo mismo, pero las borra. Devuelve cuántas eran. */
      app.post('/admin/data/delete', async (request, reply) => {
        return reply.send(await service.wipe(await session.actor(request), request.body, true))
      })

      /** `GET /admin/tickets` → el buzón entero, lo pendiente primero. */
      app.get('/admin/tickets', async (request, reply) => {
        return reply.send(await service.tickets(await session.actor(request)))
      })

      /** `DELETE /admin/tickets/:id` → borra un mensaje del buzón (spam). 204. */
      app.delete<{ Params: { id: string } }>('/admin/tickets/:id', async (request, reply) => {
        await service.removeTicket(
          await session.actor(request),
          idParam(request.params.id, 'El mensaje'),
        )

        return reply.code(204).send()
      })

      /** `POST /admin/tickets/:id/answer` → `{ answer, status? }`. */
      app.post<{ Params: { id: string } }>('/admin/tickets/:id/answer', async (request, reply) => {
        return reply.send(
          await service.answerTicket(
            await session.actor(request),
            idParam(request.params.id, 'El mensaje'),
            request.body,
          ),
        )
      })
    },
    stores: [
      tableStore(deps.db, {
        id: 'traffic',
        table: 'request_stats',
        login: 'login',
        date: { column: 'day', as: 'day' },
        show: ['login', 'day', 'hour', 'requests', 'bytes', 'limited'],
      }),
      tableStore(deps.db, {
        id: 'tickets',
        table: 'tickets',
        login: 'login',
        date: { column: 'created_at', as: 'iso' },
        show: ['id', 'login', 'kind', 'subject', 'status', 'created_at'],
      }),
    ],
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
