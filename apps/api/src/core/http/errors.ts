/**
 * De `DomainError` a código HTTP.
 *
 * La decisión vive en un solo sitio para que los tests puedan comprobar cada
 * código sin levantar el servidor.
 */

import { DomainError } from '../errors.js'
import { ApiError } from '../../integrations/forty-two/errors.js'

export type ErrorMapping = {
  status: number
  /** Cuerpo JSON que ve el front. */
  body: { error: string; message: string }
}

export function statusForError(error: unknown): number {
  if (error instanceof DomainError) {
    switch (error.code) {
      case 'unauthenticated':
        return 401
      case 'not_found':
        return 404
      case 'invalid_input':
        return 400
      case 'forbidden':
        return 403
      case 'conflict':
        return 409
      default:
        return 500
    }
  }

  // Un 429 de la 42 hacia el front es un 503: no es culpa de quien está
  // usando la web y no puede arreglarlo reintentando.
  if (error instanceof ApiError) {
    return error.status === 429 ? 503 : error.status
  }

  return 500
}

export function mapError(error: unknown): ErrorMapping {
  if (error instanceof DomainError) {
    return {
      status: statusForError(error),
      body: { error: error.code, message: error.message },
    }
  }

  if (error instanceof ApiError) {
    return {
      status: statusForError(error),
      body: { error: error.code, message: error.message },
    }
  }

  // Lo que rechaza el propio servidor antes de llegar a una ruta (un JSON mal
  // escrito, un cuerpo demasiado grande, un tipo de contenido que no entiende)
  // es culpa de la petición, no nuestra: se devuelve con su código y un mensaje
  // fijo, sin el texto del error, que puede citar parte de lo recibido.
  const rejected = requestRejection(error)

  if (rejected !== undefined) {
    return rejected
  }

  // Lo que no se reconoce se registra entero pero al front solo se le da un
  // mensaje genérico: un error interno puede traer rutas de ficheros o SQL.
  return {
    status: 500,
    body: {
      error: 'internal_error',
      message: 'Algo ha ido mal por nuestra parte. Prueba de nuevo en un momento.',
    },
  }
}

const REJECTIONS: Record<number, { error: string; message: string }> = {
  400: { error: 'invalid_input', message: 'La petición no se entiende' },
  404: { error: 'not_found', message: 'No existe' },
  408: { error: 'invalid_input', message: 'La petición ha tardado demasiado en llegar' },
  413: { error: 'invalid_input', message: 'La petición es demasiado grande' },
  414: { error: 'invalid_input', message: 'La dirección es demasiado larga' },
  415: { error: 'invalid_input', message: 'Ese tipo de contenido no se admite' },
}

/** Un error de Fastify por una petición mal formada, o `undefined` si no lo es. */
function requestRejection(error: unknown): ErrorMapping | undefined {
  if (typeof error !== 'object' || error === null) return undefined

  const { code, statusCode } = error as { code?: unknown; statusCode?: unknown }

  // Solo los del servidor (`FST_ERR_…`): un error cualquiera que traiga un
  // `statusCode` no decide por su cuenta qué se le contesta a la gente.
  if (typeof code !== 'string' || !code.startsWith('FST_ERR_') || typeof statusCode !== 'number') {
    return undefined
  }

  const body = REJECTIONS[statusCode]

  return body === undefined ? undefined : { status: statusCode, body }
}
