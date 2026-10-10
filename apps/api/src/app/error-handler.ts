/**
 * Un solo manejador de errores para toda la app.
 *
 * Lo que no se reconoce se registra entero y a la web solo le llega un mensaje
 * genérico: un error interno puede traer rutas de ficheros, SQL o parte de un
 * token.
 */

import type { FastifyInstance } from 'fastify'

import { mapError } from '../core/http/errors.js'
import { ApiError } from '../integrations/forty-two/errors.js'

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const mapped = mapError(error)

    if (mapped.status >= 500) {
      request.log.error({ err: error }, 'error no controlado')
    } else {
      request.log.warn({ err: error }, 'error de cliente')
    }

    if (error instanceof ApiError) {
      request.log.debug(
        { endpoint: error.endpoint, code: error.code, status: error.status },
        'error de la API de 42',
      )
    }

    reply.code(mapped.status).send(mapped.body)
  })
}
