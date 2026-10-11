/**
 * Módulo `help`: ayuda reservada. Franjas en las que alguien se ofrece,
 * reservas que hay que aceptar, valoración mutua y bloqueos.
 */

import type { Db } from '../../core/db/database.js'
import type { AppModule } from '../../core/module.js'
import type { XpService } from '../profile/index.js'
import type { Agenda, ReplicaRepository, Syncer } from '../replica/index.js'
import { createHelpRepository } from './help.repository.js'
import { registerHelpRoutes } from './help.routes.js'
import { createHelpService } from './help.service.js'
import type { HelpService } from './help.service.js'

export type HelpModuleDeps = {
  db: Db
  replica: ReplicaRepository
  agenda: Agenda
  sync: Syncer
  xp: XpService
  now?: () => number
}

export type HelpModule = AppModule & { service: HelpService }

export function createHelpModule(deps: HelpModuleDeps): HelpModule {
  const service = createHelpService({
    help: createHelpRepository(deps.db),
    replica: deps.replica,
    agenda: deps.agenda,
    sync: deps.sync,
    xp: deps.xp,
    ...(deps.now === undefined ? {} : { now: deps.now }),
  })

  return {
    name: 'help',
    service,
    routes: (app, context) => {
      registerHelpRoutes(app, context, service)
    },
    jobs: [
      {
        name: 'comprobación de sesiones de ayuda',
        everyMs: 60_000,
        run: async () => {
          await service.verify()
        },
      },
    ],
  }
}

export type { HelpService } from './help.service.js'
