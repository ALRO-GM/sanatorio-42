/**
 * Calendario de pizarras: sesiones para explicar un concepto delante de una
 * pizarra, propuestas por estudiantes.
 *
 * Quien imparte gana XP, pero solo cuando la pizarra ya ha pasado y fue alguien
 * más: proponer una sesión a la que no va nadie no da puntos. Ese reparto se
 * hace al leer el calendario (`settle`), que es idempotente, en vez de con un
 * temporizador: así funciona igual con o sin proceso de fondo.
 */

import type { BoardView } from '@sanatorio/contracts'
import { z } from 'zod'

import type { BoardRow, BoardsRepository } from './boards.repository.js'
import type { ReplicaRepository } from '../replica/index.js'
import { domainError } from '../../core/errors.js'
import { XP_KIND } from '../profile/index.js'
import type { XpService } from '../profile/index.js'
import { optionalText, parse, text } from '../../core/validation.js'
import type { Actor } from '../../core/actor.js'

export type BoardsServiceOptions = {
  boards: BoardsRepository
  replica: ReplicaRepository
  xp: XpService
  now?: () => number
}

const instant = z.iso.datetime({ offset: true, message: 'fecha no válida' })

const boardSchema = z.object({
  title: text(80, 3),
  topic: optionalText(30),
  description: optionalText(400),
  place: text(80),
  startsAt: instant,
  endsAt: instant,
  capacity: z.number().int().min(2).max(100).default(20),
})

const HOUR = 3_600_000

/** Pizarras futuras que puede tener propuestas una persona. */
const MAX_UPCOMING_BOARDS = 5

export function createBoardsService(options: BoardsServiceOptions) {
  const { boards, replica, xp } = options
  const now = options.now ?? Date.now

  async function view(rows: readonly BoardRow[], actor: Actor): Promise<BoardView[]> {
    const images = await replica.imagesOf(rows.map((board) => board.host))

    return rows.map((board) => {
      const { campusId: _campusId, settled: _settled, attendees, ...rest } = board

      return {
        ...rest,
        hostImage: images.get(board.host) ?? null,
        attendees: attendees.length,
        joined: attendees.includes(actor.login),
        mine: board.host === actor.login || actor.admin,
      }
    })
  }

  /** La pizarra, o 404. También si es de otro campus. */
  async function mustGet(boardId: number, actor: Actor): Promise<BoardRow> {
    const board = await boards.get(boardId)

    if (board?.campusId !== actor.campusId) {
      throw domainError('not_found', 'Esa pizarra no existe')
    }

    return board
  }

  /**
   * Reparte la XP de las pizarras que ya han terminado.
   *
   * Se marca como repartida haya ido alguien o no, para no volver a mirarla.
   */
  async function settle(): Promise<void> {
    for (const board of await boards.unsettledEndedBefore(new Date(now()).toISOString())) {
      if (board.attendees.some((login) => login !== board.host)) {
        await xp.award(board.host, XP_KIND.BOARD_HOST, `board:${board.id}`)
      }

      await boards.markSettled(board.id)
    }
  }

  return {
    settle,

    /**
     * Pizarras del campus entre dos instantes.
     *
     * Sin fechas, desde hoy hasta dentro de 60 días.
     */
    async list(actor: Actor, from?: string, to?: string): Promise<BoardView[]> {
      await settle()

      const start = parseInstant(from) ?? now() - 24 * HOUR
      const end = parseInstant(to) ?? start + 60 * 24 * HOUR

      return view(
        await boards.listBetween(
          actor.campusId,
          new Date(start).toISOString(),
          new Date(end).toISOString(),
        ),
        actor,
      )
    },

    /** Propone una pizarra. */
    async create(actor: Actor, input: unknown): Promise<BoardView> {
      const board = parse(boardSchema, input)
      const startsAt = Date.parse(board.startsAt)
      const endsAt = Date.parse(board.endsAt)

      if (startsAt < now()) {
        throw domainError('invalid_input', 'La pizarra tiene que ser en el futuro')
      }
      if (endsAt <= startsAt || endsAt - startsAt > 4 * HOUR) {
        throw domainError('invalid_input', 'Una pizarra dura entre unos minutos y cuatro horas')
      }

      const nowIso = new Date(now()).toISOString()

      if ((await boards.countUpcomingBy(actor.login, nowIso)) >= MAX_UPCOMING_BOARDS) {
        throw domainError('conflict', 'Ya tienes varias pizarras propuestas')
      }

      const boardId = await boards.create({
        ...board,
        // Siempre en UTC, para que el orden como texto sea el orden real.
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        campusId: actor.campusId,
        host: actor.login,
      })
      const [created] = await view([await mustGet(boardId, actor)], actor)

      if (created === undefined) {
        throw domainError('not_found', 'Esa pizarra no existe')
      }

      return created
    },

    /**
     * Cambia una pizarra que aún no ha terminado. Solo quien la imparte, o quien
     * modera. Las plazas no pueden quedar por debajo de las ya reservadas.
     */
    async update(actor: Actor, boardId: number, input: unknown): Promise<BoardView> {
      const current = await mustGet(boardId, actor)

      if (current.host !== actor.login && !actor.admin) {
        throw domainError('forbidden', 'Solo quien imparte la pizarra puede cambiarla')
      }
      if (Date.parse(current.endsAt) <= now()) {
        throw domainError('conflict', 'Esa pizarra ya ha terminado')
      }

      const board = parse(boardSchema, input)
      const startsAt = Date.parse(board.startsAt)
      const endsAt = Date.parse(board.endsAt)

      // Se puede retocar una pizarra que ya ha empezado sin moverle la hora;
      // lo que no se puede es llevársela al pasado.
      if (startsAt < now() && startsAt !== Date.parse(current.startsAt)) {
        throw domainError('invalid_input', 'La pizarra tiene que ser en el futuro')
      }
      if (endsAt <= startsAt || endsAt - startsAt > 4 * HOUR) {
        throw domainError('invalid_input', 'Una pizarra dura entre unos minutos y cuatro horas')
      }
      if (board.capacity < current.attendees.length) {
        throw domainError(
          'conflict',
          `Ya hay ${current.attendees.length} plazas reservadas: no puedes dejar menos`,
        )
      }

      await boards.update(boardId, {
        ...board,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      })

      const [updated] = await view([await mustGet(boardId, actor)], actor)

      if (updated === undefined) {
        throw domainError('not_found', 'Esa pizarra no existe')
      }

      return updated
    },

    /** Reserva plaza. `409` si está completa o ya ha pasado. */
    async join(actor: Actor, boardId: number): Promise<void> {
      const board = await mustGet(boardId, actor)

      if (board.attendees.includes(actor.login)) {
        return
      }
      if (Date.parse(board.endsAt) <= now()) {
        throw domainError('conflict', 'Esa pizarra ya ha terminado')
      }
      if (!(await boards.join(boardId, actor.login))) {
        throw domainError('conflict', 'No quedan plazas')
      }
    },

    /** Libera la plaza. */
    async leave(actor: Actor, boardId: number): Promise<void> {
      await mustGet(boardId, actor)
      await boards.leave(boardId, actor.login)
    },

    /** Cancela la pizarra. Solo quien la imparte, o quien modera. */
    async cancel(actor: Actor, boardId: number): Promise<void> {
      const board = await mustGet(boardId, actor)

      if (board.host !== actor.login && !actor.admin) {
        throw domainError('forbidden', 'Solo quien imparte la pizarra puede cancelarla')
      }

      await boards.remove(boardId)
    },
  }
}

export type BoardsService = ReturnType<typeof createBoardsService>

/** Milisegundos de una fecha ISO, o `undefined` si no viene o no se entiende. */
function parseInstant(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined
  }

  const parsed = Date.parse(value)

  return Number.isNaN(parsed) ? undefined : parsed
}
