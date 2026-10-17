/**
 * Módulo `therapy`: terapias de grupo. Gente del mismo proyecto que queda en un
 * sitio a unas horas, y ficha la asistencia.
 */

import type { Db } from '../../core/db/database.js'
import type { Notify } from '../../core/events.js'
import type { AppModule } from '../../core/module.js'
import type { XpService } from '../profile/index.js'
import type { ReplicaRepository, Syncer } from '../replica/index.js'
import { createTherapyRepository } from './therapy.repository.js'
import { registerTherapyRoutes } from './therapy.routes.js'
import { createTherapyService } from './therapy.service.js'
import type { TherapyService } from './therapy.service.js'

type TherapyModuleDeps = {
  db: Db
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
    ...(deps.notify === undefined ? {} : { notify: deps.notify }),
    ...(deps.now === undefined ? {} : { now: deps.now }),
  })

  return {
    name: 'therapy',
    personal: [
      { table: 'therapy_groups', logins: ['creator'] },
      { table: 'therapy_members', logins: ['login'] },
    ],
    service,
    routes: (app, context) => {
      registerTherapyRoutes(app, context, service)
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
