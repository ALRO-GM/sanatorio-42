/**
 * `GET /auth/me`.
 *
 * Sale de la cookie firmada, no de la base ni de la API de 42, así que recargar
 * la web no cuesta nada.
 */
export type CurrentUser = {
  /** Id de 42. `null` en sesiones abiertas antes de que la cookie lo llevara. */
  id: number | null
  login: string
  /** Nombre legible, o `null` si la persona no lo tiene en 42. */
  name: string | null
  /** Avatar ya resuelto a URL, o `null`. */
  image: string | null
  /** Campus principal en 42. Es el que se usa mientras no elija otro. */
  campusId: number
}
