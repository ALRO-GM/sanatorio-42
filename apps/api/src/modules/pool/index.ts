/**
 * Módulo `pool`: quién entra (estudiantes y, si se abre, piscineros) y los
 * ajustes de la piscina en el panel. Ver `docs/piscineros.md`.
 */

import type { Db } from '../../core/db/database.js'
import type { AppModule } from '../../core/module.js'
import { given } from '../../core/options.js'
import { createPoolService } from './pool.service.js'
import type { PoolService } from './pool.service.js'

type PoolDeps = {
  db: Db
  isAdmin: (login: string) => Promise<boolean>
  now?: () => number
}

export type PoolModule = AppModule & { service: PoolService }

export function createPoolModule(deps: PoolDeps): PoolModule {
  const service = createPoolService({
    db: deps.db,
    isAdmin: deps.isAdmin,
    ...given({ now: deps.now }),
  })

  return {
    name: 'pool',
    service,
    routes: (app, { session }) => {
      /** `GET /pool/notice` → `PoolNotice`, sin sesión: el aviso de la piscina cerrada. */
      app.get('/pool/notice', async (_request, reply) => {
        return reply.header('cache-control', 'public, max-age=60').send(await service.notice())
      })

      /** `GET /pool/access` → `PoolAccess`: si eres piscinero y qué puedes ver. */
      app.get('/pool/access', async (request, reply) => {
        return reply.send(await service.access(session.user(request).role === 'pool'))
      })

      /** `GET /admin/pool` → `PoolSettings`. */
      app.get('/admin/pool', async (request, reply) => {
        return reply.send(await service.forAdmin(await session.actor(request)))
      })

      /** `PUT /admin/pool` → `{ open?, message?, allow? }`: lo que cambia; devuelve cómo queda. */
      app.put('/admin/pool', async (request, reply) => {
        return reply.send(await service.update(await session.actor(request), request.body))
      })
    },
  }
}
