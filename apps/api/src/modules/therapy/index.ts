/**
 * Módulo `therapy`: terapias de grupo. Gente del mismo proyecto que queda en un
 * sitio a unas horas, y ficha la asistencia.
 */

import { NO_POOL, visibleTo } from '../../core/audience.js'
import type { Audience } from '../../core/audience.js'
import type { Db } from '../../core/db/database.js'
import type { Notify } from '../../core/events.js'
import type { AppModule } from '../../core/module.js'
import type { XpService } from '../profile/index.js'
import type { ReplicaRepository, Syncer } from '../replica/index.js'
import { createTherapyRepository } from './therapy.repository.js'
import { registerTherapyRoutes } from './therapy.routes.js'
import { createTherapyService } from './therapy.service.js'
import type { TherapyService } from './therapy.service.js'
import { given } from '../../core/options.js'

type TherapyModuleDeps = {
  db: Db
  /** Quién ve a quién: estudiantes y piscineros separados (`docs/piscineros.md`). */
  audience?: Audience
  replica: ReplicaRepository
  sync: Syncer
  xp: XpService
  notify?: Notify
  now?: () => number
}

export type TherapyModule = AppModule & { service: TherapyService }

export function createTherapyModule(deps: TherapyModuleDeps): TherapyModule {
  const service = createTherapyService({
    therapy: createTherapyRepository(deps.db),
    replica: deps.replica,
    sync: deps.sync,
    xp: deps.xp,
    ...given({ audience: deps.audience, notify: deps.notify, now: deps.now }),
  })

  return {
    name: 'therapy',
    personal: [
      { table: 'therapy_groups', logins: ['creator'] },
      { table: 'therapy_members', logins: ['login'] },
      // `present` es la lista de quienes estaban, separada por comas: cada cual
      // se lleva las sesiones en las que estuvo, con solo su login.
      { table: 'therapy_checks', lists: [{ column: 'present', format: 'csv' }] },
    ],
    service,
    routes: (app, context) => {
      const audience = deps.audience ?? NO_POOL

      // Cada cual, los grupos de gente de su mundo.
      registerTherapyRoutes(app, context, {
        ...service,
        list: async (actor, projectId) =>
          visibleTo(
            audience,
            actor,
            await service.list(actor, projectId),
            (group) => group.creator,
          ),
      })
    },
    jobs: [
      {
        name: 'asistencia a terapias',
        everyMs: 60_000,
        run: async () => {
          await service.checkAttendance()
        },
      },
    ],
  }
}

export type { TherapyService } from './therapy.service.js'
