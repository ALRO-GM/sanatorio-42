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
import type { Actor, Lang } from '../../core/actor.js'
import type { SessionReader, SessionUser } from '../../core/session.js'
import { readCookie, SESSION_COOKIE_NAME } from '../../core/http/cookies.js'

type SessionReaderOptions = {
  auth: AuthService
  profiles: ProfilesRepository
  /** Campus de quien no trae ninguno en la sesión. */
  defaultCampusId: number
  /** Logins con permiso de moderación, en minúsculas. */
  adminLogins: readonly string[]
  /**
   * Permisos y bloqueos puestos desde el panel de administración. Sin esto,
   * solo administran los de `adminLogins` y nadie está bloqueado.
   */
  access?: (
    login: string,
  ) => Promise<{ admin: boolean; block: { reason: string; until: string | null } | null }>
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

    const session = options.auth.currentUser(cookie)

    // Una sesión de staff no es de nadie de 42: no tiene expediente, ni campus,
    // ni nada que hacer en las rutas de la gente. Se corta aquí, que es por
    // donde pasan todas, y no ruta a ruta.
    if (session.role === 'staff') {
      throw new DomainError('forbidden', 'Esta cuenta solo sirve para validar documentos')
    }

    options.onActivity?.()

    return session
  }

  /** La cuenta de staff de la sesión, o `401`; `403` si la sesión es de una persona. */
  function staff(request: FastifyRequest): { id: number; name: string } {
    const session = options.auth.currentUser(
      readCookie(request.headers.cookie, SESSION_COOKIE_NAME),
    )

    if (session.role !== 'staff' || session.id === null) {
      throw new DomainError('forbidden', 'Solo para cuentas de staff')
    }

    return { id: session.id, name: session.login }
  }

  /** Campus principal de la persona en 42, con el de por defecto como red. */
  function homeCampus(session: SessionUser): number {
    return session.campusId ?? options.defaultCampusId
  }

  return {
    user,
    staff,
    homeCampus,

    /**
     * La persona y el campus que está mirando.
     *
     * El campus es el que haya elegido en sus preferencias; si no ha elegido
     * ninguno, el suyo. Cuesta una lectura a la base.
     */
    async actor(request: FastifyRequest): Promise<Actor> {
      const session = user(request)
      const [profile, access] = await Promise.all([
        options.profiles.get(session.login),
        options.access?.(session.login),
      ])

      if (access !== undefined && access.block !== null) {
        throw new DomainError('forbidden', `Tu cuenta está bloqueada: ${access.block.reason}`)
      }

      return {
        login: session.login,
        // Un piscinero mira siempre su campus: solo ve a los piscineros de él.
        campusId:
          session.role === 'pool'
            ? homeCampus(session)
            : (profile?.campusId ?? homeCampus(session)),
        // En la vista de piscinero, quien administra no administra: es un
        // piscinero a todos los efectos (moderar, borrar lo de otros…).
        admin:
          session.preview !== true &&
          (access?.admin ?? options.adminLogins.includes(session.login.toLowerCase())),
        // Lo escrito en el servidor (preguntas de Not-games) está en español,
        // inglés y francés; lo que falte en francés sale en inglés
        // (`bank/localize.ts`). El catalán y el euskera ven el español.
        lang: langOf(request.headers['x-lang']),
        ...(session.role === 'pool' ? { pool: true } : {}),
      }
    },
  }
}

/** El idioma de la cabecera `x-lang` (`fr`, `fr-FR`…); cualquier otro, español. */
function langOf(header: string | string[] | undefined): Lang {
  const code = (Array.isArray(header) ? header[0] : header)?.slice(0, 2).toLowerCase()

  return code === 'en' || code === 'fr' ? code : 'es'
}
