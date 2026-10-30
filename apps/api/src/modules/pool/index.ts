/**
 * Módulo `pool`: quién entra (estudiantes y, si se abre, piscineros), los
 * ajustes de la piscina en el panel y las personas ocultas a cada grupo. Ver
 * `docs/piscineros.md` y `docs/personas-ocultas.md`.
 */

import type { Db } from '../../core/db/database.js'
import type { AppModule } from '../../core/module.js'
import { given } from '../../core/options.js'
import { createHiddenService } from './hidden.service.js'
import type { HiddenService } from './hidden.service.js'
import { createPoolService } from './pool.service.js'
import type { PoolService } from './pool.service.js'

type PoolDeps = {
  db: Db
  isAdmin: (login: string) => Promise<boolean>
  /** Tras cambiar los ocultos: olvida lo leído (`audience.forget`). */
  hiddenChanged?: () => void
  now?: () => number
}

export type PoolModule = AppModule & { service: PoolService; hidden: HiddenService }

export { hiddenLogins } from './hidden.service.js'

export function createPoolModule(deps: PoolDeps): PoolModule {
  const service = createPoolService({
    db: deps.db,
    isAdmin: deps.isAdmin,
    ...given({ now: deps.now }),
  })

  const hidden = createHiddenService({
    db: deps.db,
    ...given({ changed: deps.hiddenChanged, now: deps.now }),
  })

  return {
    name: 'pool',
    service,
    hidden,
    // Quien oculta se lleva cuándo lo hizo, no a quién; quien está oculto, de
    // qué grupos y desde cuándo, sin el motivo ni quién (solo para el panel).
    personal: [
      {
        table: 'hidden_people',
        logins: ['login', 'hidden_by'],
        give: {
          login: ['login', 'from_students', 'from_pool', 'hidden_at'],
          hidden_by: ['hidden_by', 'hidden_at'],
        },
      },
    ],
    routes: (app, { session }) => {
      /** `GET /pool/notice` → `PoolNotice`, sin sesión: el aviso de la piscina cerrada. */
      app.get('/pool/notice', async (_request, reply) => {
        return reply.header('cache-control', 'public, max-age=60').send(await service.notice())
      })

      /** `GET /pool/access` → `PoolAccess`: si eres piscinero y qué puedes ver. */
      app.get('/pool/access', async (request, reply) => {
        const user = session.user(request)

        return reply.send(await service.access(user))
      })

      /** `GET /admin/pool` → `PoolSettings`. */
      app.get('/admin/pool', async (request, reply) => {
        return reply.send(await service.forAdmin(await session.actor(request)))
      })

      /** `PUT /admin/pool` → `{ open?, message?, allow? }`: lo que cambia; devuelve cómo queda. */
      app.put('/admin/pool', async (request, reply) => {
        return reply.send(await service.update(await session.actor(request), request.body))
      })

      /** `GET /admin/hidden` → `HiddenPerson[]`: las personas ocultas, la última primero. */
      app.get('/admin/hidden', async (request, reply) => {
        return reply.send(await hidden.list(await session.actor(request)))
      })

      /** `GET /admin/hidden/search?q=` → `HiddenCandidate[]`: gente de cualquier grupo. */
      app.get('/admin/hidden/search', async (request, reply) => {
        return reply.send(await hidden.search(await session.actor(request), request.query))
      })

      /** `PUT /admin/hidden/:login` → `HiddenPersonInput`: la oculta (o cambia cómo). */
      app.put<{ Params: { login: string } }>('/admin/hidden/:login', async (request, reply) => {
        return reply.send(
          await hidden.hide(await session.actor(request), request.params.login, request.body),
        )
      })

      /** `DELETE /admin/hidden/:login` → `HiddenPerson[]`: la vuelve a enseñar. */
      app.delete<{ Params: { login: string } }>('/admin/hidden/:login', async (request, reply) => {
        return reply.send(await hidden.reveal(await session.actor(request), request.params.login))
      })
    },
  }
}
