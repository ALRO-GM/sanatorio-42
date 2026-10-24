/**
 * Quién hace una petición.
 *
 * Lo resuelve la sesión (`modules/auth/session.ts`) y lo reciben los servicios:
 * así ninguno tiene que saber de cookies ni de dónde sale el campus.
 */

import { DomainError } from './errors.js'

/** Quién hace la petición y en qué campus está mirando. */
export type Actor = {
  login: string
  campusId: number
  /** `true` si su login está en `ADMIN_LOGINS`. */
  admin: boolean
  /** El idioma de su web (cabecera `x-lang`), para lo que se le enseña ya escrito. */
  lang?: 'es' | 'en'
  /** `true` si es piscinero: solo ve piscineros de su campus (`docs/piscineros.md`). */
  pool?: boolean
}

/**
 * Corta si quien pregunta no administra la web.
 *
 * Vive aquí, y no repetido en cada servicio, para que el mensaje y la regla
 * sean los mismos en todas partes. Además de esto, la app rechaza cualquier
 * ruta `/admin/…` a quien no administra antes de llegar al servicio.
 *
 * @throws {DomainError} `forbidden`.
 */
export function assertAdmin(actor: Actor): void {
  if (!actor.admin) {
    throw new DomainError('forbidden', 'Solo para quien administra la web')
  }
}
