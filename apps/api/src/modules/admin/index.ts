/**
 * Módulo `admin`: permisos, bloqueos, buzón y consumo.
 *
 * Además de sus rutas, cuelga dos ganchos de todas las peticiones con sesión:
 * uno antes, que corta a las cuentas bloqueadas y aplica el tope de uso, y otro
 * después, que apunta lo servido. Por eso tiene que registrarse antes que los
 * demás módulos.
 */

import { randomBytes } from 'node:crypto'

import type { FastifyRequest } from 'fastify'

import { tableStore } from '../../core/db/data-store.js'
import { readCookie, serializeCookie, setCookies } from '../../core/http/cookies.js'
import { idParam } from '../../core/http/params.js'
import type { AppModule } from '../../core/module.js'
import type { SessionReader } from '../../core/session.js'
import { ANONYMOUS, createAdminService } from './admin.service.js'
import { RESPONSE_OVERHEAD_BYTES } from './budget.rules.js'
import type { AdminService, AdminServiceOptions } from './admin.service.js'
import { createGrowthService } from './growth.js'
import { createMaintenance, openDuringMaintenance } from './maintenance.js'
import type { MaintenanceService } from './maintenance.js'
import { ELEVATION_COOKIE, ELEVATION_MS, createSecondFactor } from './second-factor.js'
import type { SecondFactor } from './second-factor.js'
import { given } from '../../core/options.js'

export type AdminModule = AppModule & {
  service: AdminService
  secondFactor: SecondFactor
  maintenance: MaintenanceService
}

type AdminModuleDeps = AdminServiceOptions & {
  /**
   * Secreto del servidor (`SESSION_SECRET`) para el segundo factor del panel.
   * Sin él (tests de servicios), uno al azar: las cookies del panel valen hasta
   * que se reinicia.
   */
  secret?: string
}

/** Lo que el panel deja abrir sin el segundo factor: lo necesario para darlo. */
const SECOND_FACTOR_PATH = '/admin/totp'

/** La cookie del panel: solo por HTTPS, solo a este dominio y nunca desde otro sitio. */
const elevationCookie = (value: string, maxAgeMs: number): string =>
  serializeCookie(ELEVATION_COOKIE, value, { maxAgeMs, path: '/', sameSite: 'strict' })

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

/**
 * La ruta de una petición como la ve el enrutador: el patrón de la ruta que
 * casó (`/admin/staff/:id`) o, si no casó ninguna, la ruta descodificada. Lo
 * que mira prefijos (`/admin/`, `/staff/`) no puede fiarse de `request.url`:
 * `%61` es `a` para el enrutador pero no para `startsWith`.
 */
function routePath(request: FastifyRequest): string {
  const raw = request.url.split('?')[0] ?? ''
  const matched = request.routeOptions.url

  if (typeof matched === 'string' && matched !== '') return matched

  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

export function createAdminModule(deps: AdminModuleDeps): AdminModule {
  const service = createAdminService(deps)
  const growth = createGrowthService(deps.db)
  const secondFactor = createSecondFactor({
    db: deps.db,
    secret: deps.secret ?? randomBytes(32).toString('hex'),
    ...given({ now: deps.now }),
  })
  const clock = deps.now ?? Date.now
  const maintenance = createMaintenance({ db: deps.db, now: clock })
  const panelCookie = (request: FastifyRequest): string | undefined =>
    readCookie(request.headers.cookie, ELEVATION_COOKIE)

  return {
    name: 'admin',
    personal: [
      // Quien administra se lleva lo que hizo desde el panel (un rol dado, un
      // bloqueo, una respuesta), pero no a quién ni lo que esa persona escribió.
      {
        table: 'user_roles',
        logins: ['login', 'granted_by'],
        give: { granted_by: ['role', 'granted_by', 'created_at'] },
      },
      {
        table: 'user_blocks',
        logins: ['login', 'blocked_by'],
        give: { blocked_by: ['until', 'blocked_by', 'created_at'] },
      },
      {
        table: 'tickets',
        logins: ['login', 'answered_by'],
        give: {
          answered_by: [
            'id',
            'kind',
            'status',
            'answer',
            'answered_by',
            'answered_at',
            'category',
            'section',
          ],
        },
      },
      // Los ajustes son de la app; de quien los tocó solo cuenta que los tocó.
      {
        table: 'settings',
        logins: ['updated_by'],
        give: { updated_by: ['key', 'updated_by', 'updated_at'] },
      },
      { table: 'request_stats', logins: ['login'] },
      { table: 'user_limits', logins: ['login'] },
      // El secreto del segundo factor no se da nunca: con él se sacan códigos.
      { table: 'admin_second_factor', logins: ['login'], omit: ['secret'] },
    ],
    service,
    secondFactor,
    maintenance,
    routes: (app, { session }) => {
      // --- Consumo: tope antes de servir, cuenta después ----------------------
      app.addHook('onRequest', async (request, reply) => {
        // La ruta tal como la ha entendido el enrutador, no tal como vino: con
        // `/%61dmin/people` el enrutador descodifica y sirve `/admin/people`,
        // así que las cerraduras tienen que mirar lo descodificado. Para lo
        // que no es ninguna ruta (404) se descodifica a mano.
        const path = routePath(request)

        // Reglas del plan. Al 90 % del tráfico del mes solo entra quien
        // administra (y las rutas de sesión, para que pueda identificarse); al
        // 95 %, nadie. Siempre queda la comprobación de salud, que es lo que
        // mira Caddy y no pesa nada.
        const level = path.startsWith('/health') ? 'ok' : await service.level()
        const session_ = level === 'admin_only' ? loginOf(session, request) : null
        const passes =
          level === 'ok' ||
          (level === 'admin_only' &&
            (path.startsWith('/auth/') ||
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
              message: `Peer4U está parado hasta el ${renews.slice(0, 10)}: se ha llegado al tope de tráfico del mes.`,
            })

          return
        }

        const who = loginOf(session, request)

        // Mantenimiento (`docs/mantenimiento.md`): solo pasa quien administra.
        // Lo que no es una ruta de la API (la propia web) se sirve igual: es la
        // web la que enseña la pantalla de mantenimiento.
        if (!request.is404 && !openDuringMaintenance(path)) {
          const state = await maintenance.current()

          if (state.on && (who === null || !(await service.accessOf(who)).admin)) {
            const left = state.until === null ? 0 : Date.parse(state.until) - clock()

            await reply
              .code(503)
              .header('Retry-After', String(Math.max(60, Math.ceil(left / 1000))))
              .send({
                error: 'maintenance',
                message: 'Peer4U está en mantenimiento. Vuelve en un rato.',
                until: state.until,
              })

            return
          }
        }

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
        if (block !== null && !path.startsWith('/auth/')) {
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

        // Tercera cerradura: el panel pide además el código de la app de
        // autenticación, cada 12 horas y en cada navegador.
        if (
          adminOnly &&
          !path.startsWith(SECOND_FACTOR_PATH) &&
          !secondFactor.elevated(who, panelCookie(request))
        ) {
          await reply.code(403).send({
            error: 'second_factor',
            message: 'Escribe el código de tu app de autenticación para abrir el panel',
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

      // --- Segundo factor del panel -------------------------------------------
      /** `GET /admin/totp` → `{ enrolled, elevatedUntil }`: si hay que darse de alta o escribir el código. */
      app.get('/admin/totp', async (request, reply) => {
        const { login } = session.user(request)

        return reply.send(await secondFactor.status(login, panelCookie(request)))
      })

      /** `POST /admin/totp/setup` → `{ uri }`: un secreto nuevo para el QR, mientras no se haya confirmado. */
      app.post('/admin/totp/setup', async (request, reply) => {
        return reply.send(await secondFactor.setup(session.user(request).login))
      })

      /** `POST /admin/totp/confirm` y `/verify` → `{ code }`: abren el panel 12 horas. 204. */
      for (const [path, run] of [
        ['/admin/totp/confirm', secondFactor.confirm],
        ['/admin/totp/verify', secondFactor.verify],
      ] as const) {
        app.post(path, async (request, reply) => {
          const value = await run(session.user(request).login, request.body)

          setCookies(reply, [elevationCookie(value, ELEVATION_MS)])

          return reply.code(204).send()
        })
      }

      /** `POST /admin/totp/lock` → cierra el panel en este navegador. 204. */
      app.post('/admin/totp/lock', async (request, reply) => {
        session.user(request)
        setCookies(reply, [elevationCookie('', 0)])

        return reply.code(204).send()
      })

      // --- Mantenimiento ------------------------------------------------------
      /**
       * `GET /maintenance` → `{ on, message, until, since, exempt }`. Sin sesión
       * también: la pantalla de entrada tiene que saber que la web está cerrada.
       */
      app.get('/maintenance', async (request, reply) => {
        const who = loginOf(session, request)

        return reply.send(
          await maintenance.status(who !== null && (await service.accessOf(who)).admin),
        )
      })

      /** `PUT /admin/maintenance` → `{ on, message?, until? }`; devuelve cómo queda. */
      app.put('/admin/maintenance', async (request, reply) => {
        return reply.send(await maintenance.set(await session.actor(request), request.body))
      })

      // --- Buzón de la gente ---------------------------------------------------
      /** `POST /tickets` → manda una incidencia, una sugerencia o una denuncia. */
      app.post('/tickets', async (request, reply) => {
        return reply
          .code(201)
          .send(await service.openTicket(await session.actor(request), request.body))
      })

      /**
       * `POST /tickets/suggestion` → una mejora soltada con la burbuja de la
       * cabecera: `{ problem, proposal?, place }` (`docs/sugerencias.md`).
       */
      app.post('/tickets/suggestion', async (request, reply) => {
        return reply
          .code(201)
          .send(await service.openSuggestion(await session.actor(request), request.body))
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

      /** `GET /admin/growth?from=&to=&campus=` → uso por campus y usuarios totales y nuevos por día. */
      app.get('/admin/growth', async (request, reply) => {
        return reply.send(await growth.growth(await session.actor(request), request.query))
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
