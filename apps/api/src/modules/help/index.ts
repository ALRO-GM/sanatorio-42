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
import { given } from '../../core/options.js'

type HelpModuleDeps = {
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
    ...given({
      notify: deps.notify,
      commitments: deps.commitments,
      presenceOf: deps.presenceOf,
      now: deps.now,
    }),
  })

  return {
    name: 'help',
    personal: [
      { table: 'help_days', logins: ['login'] },
      // Una reserva es de las dos partes, pero cada cual se lleva lo suyo: la
      // nota la escribió quien pidió; `helper_tag` describe a quien ayudó y
      // `requester_tag` a quien pidió, así que cada etiqueta va a quien describe.
      // `news_for` siempre es una de las dos personas: solo aporta el estado.
      {
        table: 'help_bookings',
        logins: ['helper', 'requester', 'news_for'],
        give: {
          helper: [
            'id',
            'campus_id',
            'helper',
            'requester',
            'project_id',
            'day',
            'start_min',
            'minutes',
            'status',
            'verified',
            'helper_tag',
            'xp',
            'created_at',
          ],
          requester: [
            'id',
            'campus_id',
            'helper',
            'requester',
            'project_id',
            'day',
            'start_min',
            'minutes',
            'note',
            'status',
            'verified',
            'requester_tag',
            'xp',
            'created_at',
          ],
          news_for: ['id', 'status', 'news_for'],
        },
      },
      // Bloquear es decisión de quien bloquea; a quien bloquearon no se le dice
      // quién fue (la web tampoco lo enseña), solo que pasó y cuándo.
      { table: 'help_blocks', logins: ['blocker', 'blocked'], give: { blocked: ['created_at'] } },
    ],
    service,
    routes: (app, context) => {
      registerHelpRoutes(app, context, service)
    },
  }
}

export type { HelpService } from './help.service.js'
