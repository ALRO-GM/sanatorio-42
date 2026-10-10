/** Códigos de error que puede devolver la API. */
export type ErrorCode =
  /** 401: no hay sesión, o ha caducado. */
  | 'unauthenticated'
  /** 404 */
  | 'not_found'
  /** 400: el cuerpo o los parámetros no valen. */
  | 'invalid_input'
  /** 403: hay sesión, pero esa persona no puede hacer eso. */
  | 'forbidden'
  /** 409: la petición es correcta pero choca con el estado actual. */
  | 'conflict'
  /** 500 */
  | 'internal_error'
  // Los errores de la API de 42 traen su propio código (`rate_limited`…).
  | (string & {})

/** Cuerpo de cualquier respuesta de error. */
export type ErrorBody = {
  error: ErrorCode
  /** Mensaje en español, pensado para enseñarlo. */
  message: string
}
