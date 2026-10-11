/**
 * Módulo `boards`: el calendario de pizarras, sesiones para explicar un
 * concepto que proponen los propios estudiantes.
 */

import type { Db } from '../../core/db/database.js'
import type { EventBus, Notify } from '../../core/events.js'
import type { AppModule } from '../../core/module.js'
import type { AttendanceService } from '../attendance/index.js'
import type { XpService } from '../profile/index.js'
import type { ReplicaRepository } from '../replica/index.js'
import { createBoardsRepository } from './boards.repository.js'
import { registerBoardsRoutes } from './boards.routes.js'
import { createBoardsService } from './boards.service.js'
import type { BoardsService } from './boards.service.js'

export type BoardsModuleDeps = {
  db: Db
  replica: ReplicaRepository
  xp: XpService
  attendance: AttendanceService
  events: EventBus
  notify?: Notify
  now?: () => number
}

export type BoardsModule = AppModule & { service: BoardsService }

export function createBoardsModule(deps: BoardsModuleDeps): BoardsModule {
  const service = createBoardsService({
    boards: createBoardsRepository(deps.db),
    replica: deps.replica,
    xp: deps.xp,
    attendance: deps.attendance,
    ...(deps.notify === undefined ? {} : { notify: deps.notify }),
    ...(deps.now === undefined ? {} : { now: deps.now }),
  })

  // La XP de impartir una pizarra se reparte cuando ya ha pasado. Se aprovecha
  // que alguien mira su expediente para dejarlo al día.
  deps.events.on('profile.viewed', () => service.settle())

  return {
    name: 'boards',
    service,
    routes: (app, context) => {
      registerBoardsRoutes(app, context, service)
    },
  }
}

export type { BoardsService } from './boards.service.js'
