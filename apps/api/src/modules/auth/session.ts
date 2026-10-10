/**
 * Quién hace la petición y qué campus está mirando.
 *
 * Todas las rutas con sesión empiezan igual: leer la cookie, comprobarla y
 * decidir el campus. Vive aquí, y no repetido en cada fichero de rutas, para
 * que esa decisión se tome en un solo sitio.
 */

import type { FastifyRequest } from 'fastify'

import type { AuthService } from './auth.service.js'
import type { ProfilesRepository } from '../profile/index.js'
import { DomainError } from '../../core/errors.js'
import type { Actor } from '../../core/actor.js'
import type { SessionReader, SessionUser } from '../../core/session.js'
import { readCookie, SESSION_COOKIE_NAME } from '../../core/http/cookies.js'

export type SessionReaderOptions = {
  auth: AuthService
  profiles: ProfilesRepository
  /** Campus de quien no trae ninguno en la sesión. */
  defaultCampusId: number
  /** Logins con permiso de moderación, en minúsculas. */
  adminLogins: readonly string[]
  /** Aviso de actividad, para que la sincronización sepa que hay alguien mirando. */
  onActivity?: () => void
}

export function createSessionReader(options: SessionReaderOptions): SessionReader {
  /**
   * La persona de la sesión, o `401`.
   *
   * No toca la base: sale de la cookie firmada.
   */
  function user(request: FastifyRequest): SessionUser {
    const cookie = readCookie(request.headers.cookie, SESSION_COOKIE_NAME)

    if (cookie === undefined) {
      throw new DomainError('unauthenticated', 'No hay sesión iniciada')
    }

    options.onActivity?.()

    return options.auth.currentUser(cookie)
  }

  /** Campus principal de la persona en 42, con el de por defecto como red. */
  function homeCampus(session: SessionUser): number {
    return session.campusId ?? options.defaultCampusId
  }

  return {
    user,
    homeCampus,

    /**
     * La persona y el campus que está mirando.
     *
     * El campus es el que haya elegido en sus preferencias; si no ha elegido
     * ninguno, el suyo. Cuesta una lectura a la base.
     */
    async actor(request: FastifyRequest): Promise<Actor> {
      const session = user(request)
      const profile = await options.profiles.get(session.login)

      return {
        login: session.login,
        campusId: profile?.campusId ?? homeCampus(session),
        admin: options.adminLogins.includes(session.login.toLowerCase()),
      }
    },
  }
}
