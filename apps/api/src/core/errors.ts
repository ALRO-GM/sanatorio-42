/**
 * Errores de negocio, distinguibles de los fallos técnicos.
 *
 * El servidor los traduce a un código HTTP (ver `src/server`), así que aquí no
 * hay ningún `status` ni rastro de Fastify: los servicios no saben que existe
 * una capa web.
 */

type DomainErrorCode =
  /** No hay sesión, o la sesión no corresponde a nadie. */
  | 'unauthenticated'
  /** El recurso pedido no existe. */
  | 'not_found'
  /** La petición está mal formada. */
  | 'invalid_input'
  /** Hay sesión, pero esa persona no puede hacer eso. */
  | 'forbidden'
  /** Demasiados intentos en poco tiempo: hay que esperar. */
  | 'rate_limited'
  /** La petición es correcta pero choca con el estado actual (grupo lleno, ya reaccionaste hoy). */
  | 'conflict'

export class DomainError extends Error {
  readonly code: DomainErrorCode

  constructor(code: DomainErrorCode, message: string) {
    super(message)
    this.name = 'DomainError'
    this.code = code
  }
}

/** Atajo legible para crear uno. */
export function domainError(code: DomainErrorCode, message: string): DomainError {
  return new DomainError(code, message)
}
