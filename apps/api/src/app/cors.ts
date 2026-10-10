/**
 * CORS con credenciales.
 *
 * Solo hace falta en desarrollo: en producción la web y la API se sirven desde
 * el mismo dominio, así que no hay nada cruzado. En local la web va en
 * `localhost:5173` y la API en `localhost:3000`, y sin esto la cookie de sesión
 * no viaja.
 */

import type { FastifyInstance } from 'fastify'

export function registerCors(app: FastifyInstance, allowedOrigins: readonly string[]): void {
  app.addHook('onRequest', async (request, reply) => {
    // Sin `Vary` las cachés HTTP pueden guardar la respuesta de un origen y
    // servirla a otro.
    reply.header('Vary', 'Origin')

    const origin = request.headers.origin

    // Sin `Origin` (curl, health checks) no hace falta CORS. Y a un origen que
    // no está en la lista no se le dan cabeceras: el navegador bloquea, que es
    // justo lo que se quiere.
    if (origin === undefined || !allowedOrigins.includes(origin)) {
      return
    }

    reply.header('Access-Control-Allow-Origin', origin)
    reply.header('Access-Control-Allow-Credentials', 'true')
    reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    reply.header('Access-Control-Allow-Headers', 'Content-Type')
    // Sin esto el navegador deja pasar la respuesta pero oculta las cabeceras
    // propias, y el total de participantes llega a la web como si no existiera.
    reply.header(
      'Access-Control-Expose-Headers',
      'X-Total-Participants, X-Peers-Returned, X-Partial',
    )
    reply.header('Access-Control-Max-Age', '600')
  })

  app.options('/*', async (_request, reply) => reply.code(204).send())
}
