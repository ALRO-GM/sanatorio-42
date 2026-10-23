/**
 * Comprobaciones de vida.
 */

import type { FastifyInstance } from 'fastify'

import type { DbHealth } from '@sanatorio/contracts'

import { schemaVersion } from '../core/db/database.js'
import type { Db } from '../core/db/database.js'
import { LATEST_VERSION } from '../core/db/migrations/index.js'

type HealthDeps = {
  db: Db
  /** Commit desplegado, o `null` si no se sabe (en local). */
  version: string | null
  /** Instante (ms) de la última sincronización con 42, o `null` si no ha habido. */
  lastSyncAt: () => Promise<number | null>
  now: () => number
}

export function registerHealth(app: FastifyInstance, deps: HealthDeps): void {
  /**
   * `GET /health` → el proceso vive. No toca ni la base ni la API de 42: es la
   * que usan Docker y el proxy, y se llama cada pocos segundos.
   */
  app.get('/health', () => ({ status: 'ok' }))

  /**
   * `GET /health/db` → la base responde, y lo que mira quien despliega: qué
   * commit contesta, si el esquema de la base es el que el código espera y de
   * cuándo son los datos de 42. Es la que hay que mirar cuando alguien dice
   * "no me salen mis proyectos". Sin sesión y sin datos personales.
   */
  app.get('/health/db', async (request, reply): Promise<DbHealth> => {
    try {
      const [actual, lastSync] = await Promise.all([schemaVersion(deps.db), deps.lastSyncAt()])

      return {
        status: 'ok',
        database: 'ok',
        version: deps.version,
        schema: { expected: LATEST_VERSION, actual },
        syncAgeSeconds:
          lastSync === null ? null : Math.max(0, Math.round((deps.now() - lastSync) / 1000)),
      }
    } catch (error) {
      request.log.error({ err: error, requestId: request.id }, 'no se pudo consultar la base')
      reply.code(503)

      return {
        status: 'degraded',
        database: 'error',
        version: deps.version,
        schema: { expected: LATEST_VERSION, actual: null },
        syncAgeSeconds: null,
      }
    }
  })
}
