/**
 * Módulo `help`: ayuda reservada. Franjas en las que alguien se ofrece,
 * reservas que hay que aceptar, valoración mutua y bloqueos.
 */

import type { Db } from '../../core/db/database.js'
import type { Notify } from '../../core/events.js'
import type { AppModule } from '../../core/module.js'
import type { AttendanceService } from '../attendance/index.js'
import type { XpService } from '../profile/index.js'
import type { Agenda, ReplicaRepository } from '../replica/index.js'
import { createHelpRepository } from './help.repository.js'
import { registerHelpRoutes } from './help.routes.js'
import { createHelpService } from './help.service.js'
import type { Commitments, HelpService } from './help.service.js'

export type HelpModuleDeps = {
  db: Db
  replica: ReplicaRepository
  agenda: Agenda
  xp: XpService
  attendance: AttendanceService
  notify?: Notify
  /** Lo que alguien ya tiene en el calendario: ahí no se puede ofrecer. */
  commitments?: Commitments
  /** Interruptor de guardia y puesto de alguien: lo sabe `peers`. */
  presenceOf?: (login: string) => Promise<{ available: boolean; seat: string | null }>
  now?: () => number
}

export type HelpModule = AppModule & { service: HelpService }

export function createHelpModule(deps: HelpModuleDeps): HelpModule {
  const service = createHelpService({
    help: createHelpRepository(deps.db),
    replica: deps.replica,
    agenda: deps.agenda,
    xp: deps.xp,
    attendance: deps.attendance,
    ...(deps.notify === undefined ? {} : { notify: deps.notify }),
    ...(deps.commitments === undefined ? {} : { commitments: deps.commitments }),
    ...(deps.presenceOf === undefined ? {} : { presenceOf: deps.presenceOf }),
    ...(deps.now === undefined ? {} : { now: deps.now }),
  })

  return {
    name: 'help',
    personal: [
      { table: 'help_days', logins: ['login'] },
      { table: 'help_bookings', logins: ['helper', 'requester'] },
    ],
    service,
    routes: (app, context) => {
      registerHelpRoutes(app, context, service)
    },
  }
}

export type { Commitments, HelpService } from './help.service.js'
