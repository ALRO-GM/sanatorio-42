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
      // Con el `requestId` explícito además del `reqId` que pino ya pone: es
      // el mismo valor que la cabecera `x-request-id` de la respuesta, y así
      // se busca por el mismo nombre que se le da a quien lo reporta.
      request.log.error(
        { err: error, requestId: request.id, status: mapped.status, route: request.url },
        'error no controlado',
      )
    } else {
      // Un 401 sin sesión o un 400 por un dato mal escrito son del día a día:
      // a `info`, para que el registro a `warn` solo tenga lo que va mal.
      request.log.info({ err: error, status: mapped.status }, 'error de cliente')
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
