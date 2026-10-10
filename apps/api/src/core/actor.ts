/**
 * Quién hace una petición.
 *
 * Lo resuelve la sesión (`modules/auth/session.ts`) y lo reciben los servicios:
 * así ninguno tiene que saber de cookies ni de dónde sale el campus.
 */

/** Quién hace la petición y en qué campus está mirando. */
export type Actor = {
  login: string
  campusId: number
  /** `true` si su login está en `ADMIN_LOGINS`. */
  admin: boolean
}
