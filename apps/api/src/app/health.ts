/**
 * Comprobaciones de vida.
 */

import type { FastifyInstance } from 'fastify'

import type { Db } from '../core/db/database.js'

export function registerHealth(app: FastifyInstance, db: Db): void {
  /**
   * `GET /health` → el proceso vive. No toca ni la base ni la API de 42: es la
   * que usan Docker y el proxy, y se llama cada pocos segundos.
   */
  app.get('/health', () => ({ status: 'ok' }))

  /**
   * `GET /health/db` → la base responde. Es la que hay que mirar cuando alguien
   * dice "no me salen mis proyectos".
   */
  app.get('/health/db', async (request, reply) => {
    try {
      await db.execute('SELECT 1')

      return { status: 'ok', database: 'ok' }
    } catch (error) {
      request.log.error({ err: error }, 'no se pudo consultar la base')

      return reply.code(503).send({
        status: 'degraded',
        database: 'error',
        error: 'No se pudo conectar con la base de datos',
      })
    }
  })
}
