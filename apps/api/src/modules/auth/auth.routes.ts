/**
 * Rutas de autenticación: login, callback, me y logout.
 *
 * Cada una es pequeña y delgada: si una ruta empieza a tener lógica de
 * negocio, esa lógica va al servicio. Aquí solo hay cookies y redirecciones.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify'

import { assertAdmin } from '../../core/actor.js'
import { DomainError } from '../../core/errors.js'
import type { SessionReader } from '../../core/session.js'
import { createRateLimit } from '../../core/rate-limit.js'
import type { RateLimit } from '../../core/rate-limit.js'
import type { AuthService } from './auth.service.js'
import { LoginRefused } from './auth.service.js'
import { mapError } from '../../core/http/errors.js'
import {
  OAUTH_STATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  clearCookie,
  readCookie,
  serializeCookie,
  setCookies,
} from '../../core/http/cookies.js'

type AuthRoutesOptions = {
  auth: AuthService
  /** A dónde se vuelve al terminar el login, y a dónde se va si falla. */
  frontendUrl: string
  /** Vida de la cookie de estado, para borrarla con la misma caducidad. */
  stateTtlMs?: number
  /** Tope de entradas por IP. Por defecto, `LOGIN_ATTEMPTS` cada diez minutos. */
  attempts?: RateLimit
  /**
   * La cuenta de staff a la que corresponde una clave, o `null`. Sin esto no
   * hay entrada de staff.
   */
  staff?: (key: unknown) => Promise<{ id: number; name: string } | null>
  /** Tope de claves de staff falladas por IP. */
  staffAttempts?: RateLimit
  /**
   * La sesión y si un login administra hoy, para la vista de piscinero de
   * quien administra. Sin esto no hay vista previa.
   */
  preview?: { session: SessionReader; isAdmin: (login: string) => Promise<boolean> }
}

/**
 * Claves de staff falladas que caben por IP cada cuarto de hora. Una clave
 * tiene 256 bits: no se adivina. El tope está para que probar no salga gratis
 * (cada intento es un resumen caro de calcular) y para que quede corto.
 */
const STAFF_KEY_ATTEMPTS = 10
const STAFF_KEY_WINDOW_MS = 15 * 60 * 1000

/**
 * Pasos de login que caben por IP cada diez minutos. Un login son dos (ir a 42
 * y volver), así que son cien logins: de sobra para un campus entero que sale
 * por la misma dirección, y muy poco para quien quiera usar la vuelta de 42
 * (que canjea un código contra su servidor) como martillo.
 */
const LOGIN_ATTEMPTS = 200
const LOGIN_WINDOW_MS = 10 * 60 * 1000

export function registerAuthRoutes(app: FastifyInstance, options: AuthRoutesOptions) {
  const { auth } = options
  const stateTtlMs = options.stateTtlMs ?? 10 * 60 * 1000
  const attempts =
    options.attempts ?? createRateLimit({ max: LOGIN_ATTEMPTS, windowMs: LOGIN_WINDOW_MS })

  function cookieOf(request: FastifyRequest, name: string): string | undefined {
    return readCookie(request.headers.cookie, name)
  }

  /**
   * Cookie que olvida el estado de OAuth.
   *
   * Se recoge en un array y se manda todo de golpe: Fastify reemplaza el
   * `Set-Cookie` anterior en vez de añadirlo, así que mandar dos por separado
   * deja solo una en la respuesta.
   */
  function forgetState(): string {
    return clearCookie(OAUTH_STATE_COOKIE_NAME, { maxAgeMs: 0, path: '/' })
  }

  /**
   * `Set-Cookie` de la sesión.
   *
   * El `Max-Age` va aquí **y** dentro del valor firmado (ver `auth.service.ts`).
   * Redundante a propósito: el `Max-Age` lo aplica el navegador, y el `exp`
   * firmado lo comprueba el servidor. Con los dos, ni un reloj manipulado ni una
   * cookie reescrita a mano sirven de algo.
   */
  function sessionCookieHeader(value: string): string {
    return serializeCookie(SESSION_COOKIE_NAME, value, {
      maxAgeMs: auth.sessionTtlMs,
      path: '/',
    })
  }

  /**
   * Front con el motivo del fallo en la query, para poder mostrar un mensaje.
   *
   * La URL del front sale de la propia cookie de sesión cuando la hay (porque
   * ahí viene `redirectUrl`), y si no, de lo que dejó el login.
   */
  function frontWithError(frontendUrl: string, error: string, status: number): string {
    const url = new URL(frontendUrl)
    url.searchParams.set('error', error)
    url.searchParams.set('status', String(status))

    return url.toString()
  }

  /**
   * `GET /auth/login` → a la 42.
   *
   * La cookie de estado va con `SameSite=Lax` y no `Strict`: con `Strict` el
   * navegador no la mandaría al volver de la 42, que es otro origen, y el
   * login fallaría siempre. `Lax` sí la manda en navegaciones de primer nivel,
   * que es justo el caso del callback.
   */
  app.get('/auth/login', async (request, reply) => {
    if (!attempts.hit(request.ip)) {
      return await reply.redirect(frontWithError(options.frontendUrl, 'rate_limited', 429), 302)
    }

    const start = auth.startLogin()

    setCookies(reply, [
      serializeCookie(OAUTH_STATE_COOKIE_NAME, start.stateCookie, {
        maxAgeMs: stateTtlMs,
        path: '/',
      }),
    ])

    return await reply.redirect(start.redirectUrl, 302)
  })

  /**
   * `GET /auth/callback` → canje del código y vuelta al front.
   *
   * Un fallo también acaba en el front, con `?error=...`, y no como un 500 en
   * blanco: el usuario viene del navegador y ver JSON sin más no le dice nada.
   */
  app.get<{ Querystring: { code?: string; state?: string } }>(
    '/auth/callback',
    async (request, reply) => {
      const stateCookie = cookieOf(request, OAUTH_STATE_COOKIE_NAME)

      // Antes de canjear nada: cada vuelta le cuesta una petición a 42.
      if (!attempts.hit(request.ip)) {
        setCookies(reply, [forgetState()])

        return await reply.redirect(frontWithError(options.frontendUrl, 'rate_limited', 429), 302)
      }

      try {
        if (request.query.code === undefined || request.query.state === undefined) {
          throw new DomainError('invalid_input', 'Falta `code` o `state` en el callback')
        }

        const result = await auth.finishLogin({
          code: request.query.code,
          state: request.query.state,
          stateCookie,
        })

        // El estado ya se ha usado: se borra, para que el enlace no sirva dos
        // veces. Y se manda la sesión, en la MISMA respuesta.
        setCookies(reply, [forgetState(), sessionCookieHeader(result.sessionCookie)])

        return await reply.redirect(result.redirectUrl, 302)
      } catch (error) {
        setCookies(reply, [forgetState()])

        // No es un fallo: 42 dice quién es y Sanatorio no le deja pasar.
        if (error instanceof LoginRefused) {
          return await reply.redirect(frontWithError(options.frontendUrl, error.reason, 403), 302)
        }

        const mapped = mapError(error)
        request.log.warn({ err: error }, 'fallo en el callback de OAuth')

        return await reply.redirect(
          frontWithError(options.frontendUrl, mapped.body.error, mapped.status),
          302,
        )
      }
    },
  )

  const staffAttempts =
    options.staffAttempts ??
    createRateLimit({ max: STAFF_KEY_ATTEMPTS, windowMs: STAFF_KEY_WINDOW_MS })

  /**
   * `POST /auth/staff` → `{ key }`: abre una sesión de staff. 204.
   *
   * La respuesta a una clave mala es siempre la misma, exista o no la cuenta.
   * Los fallos se cuentan por IP; acertar no los borra, para que una clave
   * buena no sirva de comodín para seguir probando otras.
   */
  app.post<{ Body?: { key?: unknown } }>('/auth/staff', async (request, reply) => {
    if (!staffAttempts.allowed(request.ip)) {
      return reply
        .code(429)
        .header('Retry-After', String(staffAttempts.retryAfter(request.ip)))
        .send({
          error: 'rate_limited',
          message: 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
        })
    }

    const account = (await options.staff?.(request.body?.key)) ?? null

    if (account === null) {
      staffAttempts.hit(request.ip)

      return reply.code(401).send({ error: 'unauthenticated', message: 'Esa clave no vale' })
    }

    const opened = auth.openStaffSession(account)

    reply.header(
      'Set-Cookie',
      serializeCookie(SESSION_COOKIE_NAME, opened.sessionCookie, {
        maxAgeMs: opened.ttlMs,
        path: '/',
        // Esta sesión no viene de ninguna otra web: no hace falta que viaje al
        // llegar desde un enlace de fuera.
        sameSite: 'strict',
      }),
    )

    return reply.code(204).send()
  })

  /**
   * `GET /auth/me` → la persona de la sesión.
   *
   * 401 sin sesión, tal y como dice `docs/api.md`.
   *
   * Se lee de la cookie firmada, no de la API de 42 ni de la base: el perfil se
   * copió en ella al hacer el login, así que recargar la web no gasta nada.
   */
  app.get('/auth/me', async (request, reply) => {
    const user = auth.currentUser(cookieOf(request, SESSION_COOKIE_NAME))

    // Una sesión de staff no es una persona: para la web de la gente es como
    // no haber entrado. Quién es se pregunta en `/staff/me`.
    if (user.role === 'staff') {
      throw new DomainError('unauthenticated', 'No hay sesión iniciada')
    }

    return reply.send({
      id: user.id,
      login: user.login,
      name: user.name,
      image: user.image,
      campusId: user.campusId,
    })
  })

  if (options.preview !== undefined) registerPreviewRoutes(options.preview)

  /**
   * La vista de piscinero (`docs/piscineros.md`): quien administra ve la web
   * como un piscinero de su campus, con los permisos guardados en el panel, y
   * vuelve. Viven aquí porque lo que hacen es volver a firmar la cookie.
   */
  function registerPreviewRoutes({ session, isAdmin }: NonNullable<AuthRoutesOptions['preview']>) {
    /**
     * `POST /admin/pool/preview` → 204: la cookie pasa a ser de piscinero, con
     * la marca firmada de vista previa. Desde una sesión de estudiante que
     * administra (la barrera de `/admin/` pide además el segundo factor). Vale
     * con la piscina cerrada: el corte de piscineros no mira si está abierta.
     */
    app.post('/admin/pool/preview', async (request, reply) => {
      if (session.user(request).role !== 'student') {
        throw new DomainError('forbidden', 'Solo desde una sesión de estudiante')
      }

      assertAdmin(await session.actor(request))
      reply.header(
        'Set-Cookie',
        sessionCookieHeader(auth.switchAudience(cookieOf(request, SESSION_COOKIE_NAME), 'pool')),
      )

      return reply.code(204).send()
    })

    /**
     * `POST /pool/preview/exit` → 204: vuelta a estudiante. Es de la base de los
     * piscineros, pero solo hace algo con la marca de vista previa y si quien
     * la lleva sigue administrando: un piscinero de verdad no tiene la marca
     * (va firmada) y recibe un 403.
     */
    app.post('/pool/preview/exit', async (request, reply) => {
      const user = session.user(request)

      if (user.preview !== true || !(await isAdmin(user.login.toLowerCase()))) {
        throw new DomainError('forbidden', 'No estás en la vista de piscinero')
      }

      reply.header(
        'Set-Cookie',
        sessionCookieHeader(auth.switchAudience(cookieOf(request, SESSION_COOKIE_NAME), 'student')),
      )

      return reply.code(204).send()
    })
  }

  /**
   * `POST /auth/logout` → borra la sesión. Idempotente.
   *
   * Sin tabla de sesiones no hay nada que borrar en el servidor: la sesión
   * estaba en la cookie, así que vaciarla es todo el logout. Quien copió la
   * cookie sigue dentro hasta que caduque; es el precio de no tener sesiones
   * revocables, y está anotado en `auth.service.ts`.
   */
  app.post('/auth/logout', async (_request, reply) => {
    auth.logout()
    reply.header('Set-Cookie', clearCookie(SESSION_COOKIE_NAME, { maxAgeMs: 0, path: '/' }))

    return reply.code(204).send()
  })
}
