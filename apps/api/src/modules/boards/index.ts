/**
 * Módulo `boards`: el calendario de pizarras, sesiones para explicar un
 * concepto que proponen los propios estudiantes.
 */

import { NO_POOL, visibleTo } from '../../core/audience.js'
import type { Audience } from '../../core/audience.js'
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
import { given } from '../../core/options.js'

type BoardsModuleDeps = {
  db: Db
  /** Quién ve a quién: estudiantes y piscineros separados (`docs/piscineros.md`). */
  audience?: Audience
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
    ...given({ audience: deps.audience, notify: deps.notify, now: deps.now }),
  })

  // La XP de impartir una pizarra se reparte cuando ya ha pasado. Se aprovecha
  // que alguien mira su expediente para dejarlo al día.
  deps.events.on('profile.viewed', () => service.settle())

  return {
    name: 'boards',
    personal: [
      { table: 'boards', logins: ['host'] },
      { table: 'board_attendees', logins: ['login'] },
    ],
    service,
    routes: (app, context) => {
      const audience = deps.audience ?? NO_POOL

      // Cada cual, las pizarras de gente de su mundo.
      registerBoardsRoutes(app, context, {
        ...service,
        list: async (actor, from, to) =>
          visibleTo(audience, actor, await service.list(actor, from, to), (board) => board.host),
      })
    },
  }
}

export type { BoardsService } from './boards.service.js'
