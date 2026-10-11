/**
 * Lo que pasa alrededor de un evento con otras personas.
 *
 * - **Avisos y chat**: quien participa en un evento puede decir "lo he visto",
 *   "llego tarde" o "no voy", y escribir. Todos los del evento ven lo mismo.
 * - **Asistencia con códigos** (pizarras y sesiones de ayuda): quien organiza
 *   tiene dos códigos de cuatro caracteres, uno para el principio y otro para el
 *   final. Quien asiste los escribe (o escanea su QR) y queda guardado cuándo.
 *   Solo con los dos hay asistencia válida, y de la diferencia sale cuánto duró.
 *
 * Quién participa en qué lo dice el calendario de cada persona: aquí no se
 * duplica esa regla.
 */

import { randomInt } from 'node:crypto'

import type {
  LoggedMessage,
  MeetAttendance,
  MeetCheckin,
  MeetMessage,
  MeetPresence,
  MeetReason,
  MeetThread,
} from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { createTtlCache } from '../../core/ttl-cache.js'
import { parse } from '../../core/validation.js'
import type { BoardsService } from '../boards/index.js'
import type { CalendarService } from '../calendar/index.js'
import type { HelpService } from '../help/index.js'
import type { ReplicaRepository } from '../replica/index.js'
import type { TherapyService } from '../therapy/index.js'

export type MeetServiceOptions = {
  db: Db
  calendar: CalendarService
  boards: BoardsService
  help: HelpService
  /** Para el chat de cada grupo de terapia (`group:<id>`), que no es un evento del calendario. */
  therapy: TherapyService
  replica: ReplicaRepository
  now?: () => number
}

const HOUR = 60 * 60_000

/** Ventana del calendario en la que se busca el evento: lo de ayer aún se puede comentar. */
const LOOK_BACK_MS = 36 * HOUR
const LOOK_AHEAD_MS = 14 * 24 * HOUR

/** Mensajes que se devuelven de un evento: los últimos. */
const THREAD_LIMIT = 200

/** Sin letras ni números que se confundan al leerlos en voz alta o en una pizarra. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 4

const REASONS = ['evaluation', 'other_event', 'on_my_way', 'transport', 'other'] as const

const eventId = z.string().regex(/^[a-z_]+(:[A-Za-z0-9-]+){1,3}$/, 'evento no válido')

const messageSchema = z
  .object({
    id: eventId,
    kind: z.enum(['seen', 'late', 'absent', 'text']),
    minutes: z.number().int().min(1).max(240).optional(),
    reason: z.enum(REASONS).optional(),
    body: z.string().trim().max(500).optional(),
  })
  .refine((message) => message.kind !== 'late' || message.minutes !== undefined, {
    message: 'di cuántos minutos te retrasas',
  })
  .refine((message) => message.kind !== 'text' || (message.body ?? '') !== '', {
    message: 'el mensaje está vacío',
  })

const checkinSchema = z.object({
  id: eventId,
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4}$/, 'el código son cuatro letras o números'),
})

/** Un código nuevo, distinto de `other`. */
function newCode(other?: string): string {
  for (;;) {
    const code = Array.from(
      { length: CODE_LENGTH },
      () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
    ).join('')

    if (code !== other) return code
  }
}

function presenceOf(login: string, startedAt: unknown, endedAt: unknown): MeetPresence {
  const start = typeof startedAt === 'string' ? startedAt : null
  const end = typeof endedAt === 'string' ? endedAt : null

  return {
    login,
    startedAt: start,
    endedAt: end,
    minutes:
      start === null || end === null
        ? null
        : Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 60_000)),
  }
}

export function createMeetService(options: MeetServiceOptions) {
  const { db, calendar, boards, help, therapy, replica } = options
  const now = options.now ?? Date.now
  // Preguntar al calendario en cada mensaje del chat sería caro: se recuerda un rato.
  const membership = createTtlCache<boolean>({ ttlMs: 5 * 60_000, maxEntries: 500, now })

  /**
   * Comprueba que `actor` participa en el evento.
   *
   * @throws {DomainError} `forbidden` si el evento no está en su calendario.
   */
  const assertParticipant = async (
    actor: Actor,
    userId: number | null,
    id: string,
  ): Promise<void> => {
    const takesPart = await membership.get(`${actor.login}|${actor.campusId}|${id}`, async () => {
      // El chat de un grupo de terapia es de quien está dentro, haya o no sesión pronto.
      if (id.startsWith('group:')) {
        const groupId = Number(id.slice('group:'.length))

        return (await therapy.list(actor)).some((group) => group.id === groupId && group.joined)
      }

      const { events } = await calendar.between(
        actor,
        userId,
        new Date(now() - LOOK_BACK_MS).toISOString(),
        new Date(now() + LOOK_AHEAD_MS).toISOString(),
      )

      // `joined: false` es un evento que se ve pero al que no se ha apuntado.
      return events.some((event) => event.id === id && event.joined !== false)
    })

    if (!takesPart) {
      throw domainError('forbidden', 'Ese evento no está en tu calendario')
    }
  }

  /**
   * Qué papel tiene `actor` en un evento con asistencia por códigos.
   *
   * @throws {DomainError} `invalid_input` si ese tipo de evento no los usa.
   */
  const roleIn = async (actor: Actor, id: string): Promise<'host' | 'guest'> => {
    const [kind, second, third] = id.split(':')

    if (kind === 'board') {
      const board = (await boards.list(actor)).find((entry) => entry.id === Number(second))

      if (board !== undefined && (board.joined || board.host === actor.login)) {
        return board.host === actor.login ? 'host' : 'guest'
      }
    } else if (kind === 'help' && second === 'booking') {
      const booking = (await help.today(actor)).bookings.find((entry) => entry.id === Number(third))

      if (booking !== undefined) {
        // Quien ayuda enseña los códigos; quien pidió la ayuda los escribe.
        return booking.role === 'helper' ? 'host' : 'guest'
      }
    } else {
      throw domainError('invalid_input', 'Ese tipo de evento no valida la asistencia con códigos')
    }

    throw domainError('forbidden', 'Ese evento no está en tu calendario')
  }

  /** Los códigos de un evento. Se crean la primera vez que alguien los pide. */
  const codesOf = async (id: string): Promise<{ start: string; end: string }> => {
    const start = newCode()

    await db.execute({
      sql: `INSERT OR IGNORE INTO event_codes (event_id, start_code, end_code, created_at)
            VALUES (?, ?, ?, ?)`,
      args: [id, start, newCode(start), new Date(now()).toISOString()],
    })

    const row = (
      await db.execute({
        sql: 'SELECT start_code, end_code FROM event_codes WHERE event_id = ?',
        args: [id],
      })
    ).rows[0]

    return { start: toText(row?.start_code), end: toText(row?.end_code) }
  }

  return {
    /** El chat de un evento, del mensaje más antiguo al más reciente. */
    async thread(actor: Actor, userId: number | null, id: unknown): Promise<MeetThread> {
      const event = parse(eventId, id)

      await assertParticipant(actor, userId, event)

      const result = await db.execute({
        sql: `SELECT id, login, kind, minutes, reason, body, created_at FROM (
                SELECT * FROM event_messages WHERE event_id = ? ORDER BY id DESC LIMIT ?
              ) ORDER BY id`,
        args: [event, THREAD_LIMIT],
      })
      const images = await replica.imagesOf(result.rows.map((row) => toText(row.login)))

      return {
        messages: result.rows.map((row): MeetMessage => ({
          id: toNumber(row.id),
          login: toText(row.login),
          image: images.get(toText(row.login)) ?? null,
          kind: toText(row.kind) as MeetMessage['kind'],
          minutes: row.minutes === null ? null : toNumber(row.minutes),
          reason: typeof row.reason === 'string' ? (row.reason as MeetReason) : null,
          body: typeof row.body === 'string' ? row.body : null,
          at: toText(row.created_at),
        })),
      }
    },

    /** Manda un aviso o un mensaje al chat de un evento. */
    async send(actor: Actor, userId: number | null, input: unknown): Promise<MeetThread> {
      const message = parse(messageSchema, input)

      await assertParticipant(actor, userId, message.id)
      await db.execute({
        sql: `INSERT INTO event_messages (event_id, login, kind, minutes, reason, body, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          message.id,
          actor.login,
          message.kind,
          message.kind === 'late' ? (message.minutes ?? null) : null,
          message.kind === 'late' || message.kind === 'absent' ? (message.reason ?? null) : null,
          message.body === undefined || message.body === '' ? null : message.body,
          new Date(now()).toISOString(),
        ],
      })

      return this.thread(actor, userId, message.id)
    },

    /**
     * Los últimos mensajes de todos los chats, para revisarlos si hay una
     * denuncia. Solo para quien administra la web.
     */
    async log(actor: Actor, limit = 200): Promise<LoggedMessage[]> {
      if (!actor.admin) {
        throw domainError('forbidden', 'Solo para quien administra la web')
      }

      const result = await db.execute({
        sql: `SELECT id, event_id, login, kind, body, created_at FROM event_messages
              ORDER BY id DESC LIMIT ?`,
        args: [Math.max(1, Math.min(500, limit))],
      })

      return result.rows.map((row) => ({
        id: toNumber(row.id),
        eventId: toText(row.event_id),
        login: toText(row.login),
        kind: toText(row.kind),
        body: typeof row.body === 'string' ? row.body : null,
        at: toText(row.created_at),
      }))
    },

    /** La asistencia de un evento: los códigos para quien organiza, lo validado para quien asiste. */
    async attendance(actor: Actor, id: unknown): Promise<MeetAttendance> {
      const event = parse(eventId, id)
      const role = await roleIn(actor, event)
      const result = await db.execute({
        sql: `SELECT login, started_at, ended_at FROM event_attendance
              WHERE event_id = ? ORDER BY login`,
        args: [event],
      })
      const people = result.rows.map((row) =>
        presenceOf(toText(row.login), row.started_at, row.ended_at),
      )

      return role === 'host'
        ? { role, codes: await codesOf(event), mine: null, people }
        : {
            role,
            codes: null,
            mine: people.find((entry) => entry.login === actor.login) ?? null,
            people: [],
          }
    },

    /**
     * Valida un código de asistencia. El de inicio marca cuándo empezaste; el
     * de fin, cuándo terminaste, y solo vale si antes validaste el de inicio.
     *
     * @throws {DomainError} `invalid_input` si el código no es de ese evento,
     *   `conflict` si se intenta terminar sin haber empezado.
     */
    async checkin(actor: Actor, input: unknown): Promise<MeetCheckin> {
      const { id, code } = parse(checkinSchema, input)

      if ((await roleIn(actor, id)) === 'host') {
        throw domainError('conflict', 'Los códigos los valida quien asiste, no quien organiza')
      }

      const codes = await codesOf(id)
      const phase = code === codes.start ? 'start' : code === codes.end ? 'end' : null

      if (phase === null) {
        throw domainError('invalid_input', 'Ese código no es de este evento')
      }

      const at = new Date(now()).toISOString()

      if (phase === 'start') {
        // El primer momento es el que cuenta: volver a escribirlo no lo mueve.
        await db.execute({
          sql: `INSERT INTO event_attendance (event_id, login, started_at) VALUES (?, ?, ?)
                ON CONFLICT (event_id, login) DO UPDATE SET
                  started_at = COALESCE(event_attendance.started_at, excluded.started_at)`,
          args: [id, actor.login, at],
        })
      } else {
        const updated = await db.execute({
          sql: `UPDATE event_attendance SET ended_at = COALESCE(ended_at, ?)
                WHERE event_id = ? AND login = ? AND started_at IS NOT NULL`,
          args: [at, id, actor.login],
        })

        if (updated.rowsAffected === 0) {
          throw domainError('conflict', 'Valida primero el código de inicio')
        }
      }

      const row = (
        await db.execute({
          sql: 'SELECT started_at, ended_at FROM event_attendance WHERE event_id = ? AND login = ?',
          args: [id, actor.login],
        })
      ).rows[0]

      return { phase, presence: presenceOf(actor.login, row?.started_at, row?.ended_at) }
    },
  }
}

export type MeetService = ReturnType<typeof createMeetService>
