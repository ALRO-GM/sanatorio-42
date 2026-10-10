/**
 * Ayuda reservada: lo que cada persona ofrece cada día, las reservas y los
 * bloqueos. Solo SQL.
 *
 * Las horas van en minutos desde medianoche, en la hora local del campus.
 */

import type { BookingStatus } from '@sanatorio/contracts'

import type { Db } from '../../core/db/database.js'
import { nowIso } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'

/** Una franja, en minutos desde medianoche. */
export type Span = { start: number; end: number }

export type DayRow = {
  login: string
  campusId: number
  windows: Span[]
  maxMinutes: number
}

export type BookingRow = {
  id: number
  campusId: number
  helper: string
  requester: string
  projectId: number | null
  day: string
  start: number
  minutes: number
  note: string | null
  status: BookingStatus
  verified: boolean
  /** Cómo ayudó quien ayudaba. Lo pone quien pidió la ayuda. */
  helperTag: string | null
  /** Cómo llegó quien pedía. Lo pone quien ayudó. */
  requesterTag: string | null
  /** XP repartida, o `null` si la sesión sigue abierta. */
  xp: number | null
}

const nullableText = (value: unknown): string | null => (typeof value === 'string' ? value : null)
const nullableNumber = (value: unknown): number | null =>
  value === null || value === undefined ? null : toNumber(value)

function toBooking(row: Record<string, unknown>): BookingRow {
  return {
    id: toNumber(row.id),
    campusId: toNumber(row.campus_id),
    helper: toText(row.helper),
    requester: toText(row.requester),
    projectId: nullableNumber(row.project_id),
    day: toText(row.day),
    start: toNumber(row.start_min),
    minutes: toNumber(row.minutes),
    note: nullableText(row.note),
    status: toText(row.status) as BookingStatus,
    verified: toNumber(row.verified) === 1,
    helperTag: nullableText(row.helper_tag),
    requesterTag: nullableText(row.requester_tag),
    xp: nullableNumber(row.xp),
  }
}

function toDay(row: Record<string, unknown>): DayRow {
  let windows: Span[] = []

  try {
    windows = JSON.parse(toText(row.windows)) as Span[]
  } catch {
    // Franjas ilegibles: como si no ofreciera nada.
  }

  return {
    login: toText(row.login),
    campusId: toNumber(row.campus_id),
    windows,
    maxMinutes: toNumber(row.max_minutes),
  }
}

export function createHelpRepository(db: Db) {
  async function bookings(where: string, args: (string | number)[]): Promise<BookingRow[]> {
    const result = await db.execute({
      sql: `SELECT * FROM help_bookings WHERE ${where} ORDER BY day, start_min, id`,
      args,
    })

    return result.rows.map(toBooking)
  }

  return {
    // --- Lo que se ofrece ------------------------------------------------------

    async day(login: string, day: string): Promise<DayRow | undefined> {
      const result = await db.execute({
        sql: 'SELECT * FROM help_days WHERE login = ? AND day = ?',
        args: [login, day],
      })
      const row = result.rows[0]

      return row === undefined ? undefined : toDay(row)
    },

    async saveDay(day: DayRow & { day: string }): Promise<void> {
      await db.execute({
        sql: `INSERT INTO help_days (login, campus_id, day, windows, max_minutes, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT (login, day) DO UPDATE SET
                campus_id   = excluded.campus_id,
                windows     = excluded.windows,
                max_minutes = excluded.max_minutes,
                updated_at  = excluded.updated_at`,
        args: [
          day.login,
          day.campusId,
          day.day,
          JSON.stringify(day.windows),
          day.maxMinutes,
          nowIso(),
        ],
      })
    },

    /** Todo lo que se ofrece ese día en un campus. */
    async daysIn(campusId: number, day: string): Promise<DayRow[]> {
      const result = await db.execute({
        sql: `SELECT * FROM help_days WHERE campus_id = ? AND day = ? AND windows != '[]'`,
        args: [campusId, day],
      })

      return result.rows.map(toDay)
    },

    // --- Reservas --------------------------------------------------------------

    async booking(id: number): Promise<BookingRow | undefined> {
      return (await bookings('id = ?', [id]))[0]
    },

    /** Reservas vivas (pedidas o aceptadas) de quien ayuda, ese día. */
    async activeOfHelper(helper: string, day: string): Promise<BookingRow[]> {
      return bookings(`helper = ? AND day = ? AND status IN ('pending', 'confirmed')`, [
        helper,
        day,
      ])
    },

    /** Reservas vivas de un día en un campus, para calcular huecos de golpe. */
    async activeIn(campusId: number, day: string): Promise<BookingRow[]> {
      return bookings(`campus_id = ? AND day = ? AND status IN ('pending', 'confirmed')`, [
        campusId,
        day,
      ])
    },

    /**
     * Lo que le toca ver a una persona: sus reservas de ese día (en cualquiera
     * de los dos papeles) y las aceptadas de días anteriores que aún no ha valorado.
     */
    async relevantTo(login: string, day: string): Promise<BookingRow[]> {
      return bookings(
        `(helper = ?1 OR requester = ?1) AND (
           (day = ?2 AND status != 'cancelled')
           OR (day < ?2 AND status = 'confirmed' AND xp IS NULL AND (
                (helper = ?1 AND requester_tag IS NULL) OR (requester = ?1 AND helper_tag IS NULL)
              ))
         )`,
        [login, day],
      )
    },

    /** Reservas aceptadas y sin comprobar de ese día en adelante. */
    async unverifiedSince(day: string): Promise<BookingRow[]> {
      return bookings(`status = 'confirmed' AND verified = 0 AND day >= ?`, [day])
    },

    async create(booking: {
      campusId: number
      helper: string
      requester: string
      projectId: number | null
      day: string
      start: number
      minutes: number
      note: string | null
    }): Promise<number> {
      const result = await db.execute({
        sql: `INSERT INTO help_bookings
                (campus_id, helper, requester, project_id, day, start_min, minutes, note, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          booking.campusId,
          booking.helper,
          booking.requester,
          booking.projectId,
          booking.day,
          booking.start,
          booking.minutes,
          booking.note,
          nowIso(),
        ],
      })

      return toNumber(result.lastInsertRowid)
    },

    async setStatus(id: number, status: BookingStatus): Promise<void> {
      await db.execute({
        sql: 'UPDATE help_bookings SET status = ? WHERE id = ?',
        args: [status, id],
      })
    },

    async setVerified(id: number): Promise<void> {
      await db.execute({ sql: 'UPDATE help_bookings SET verified = 1 WHERE id = ?', args: [id] })
    },

    /** Guarda la valoración que una persona hace de la otra. */
    async setTag(id: number, about: 'helper' | 'requester', tag: string): Promise<void> {
      await db.execute({
        sql: `UPDATE help_bookings SET ${about === 'helper' ? 'helper_tag' : 'requester_tag'} = ? WHERE id = ?`,
        args: [tag, id],
      })
    },

    async setXp(id: number, xp: number): Promise<void> {
      await db.execute({ sql: 'UPDATE help_bookings SET xp = ? WHERE id = ?', args: [xp, id] })
    },

    /** Rechaza lo que una persona tenga pedido a otra y siga sin contestar. */
    async declinePendingFrom(requester: string, helper: string): Promise<void> {
      await db.execute({
        sql: `UPDATE help_bookings SET status = 'declined'
              WHERE requester = ? AND helper = ? AND status = 'pending'`,
        args: [requester, helper],
      })
    },

    /** Cómo han descrito a una persona quienes la ayudaron. */
    async requesterTags(requester: string): Promise<Map<string, number>> {
      const result = await db.execute({
        sql: `SELECT requester_tag AS tag, COUNT(*) AS total FROM help_bookings
              WHERE requester = ? AND requester_tag IS NOT NULL GROUP BY requester_tag`,
        args: [requester],
      })

      return new Map(result.rows.map((row) => [toText(row.tag), toNumber(row.total)]))
    },

    // --- Bloqueos --------------------------------------------------------------

    async block(blocker: string, blocked: string): Promise<void> {
      await db.execute({
        sql: 'INSERT OR IGNORE INTO help_blocks (blocker, blocked, created_at) VALUES (?, ?, ?)',
        args: [blocker, blocked, nowIso()],
      })
    },

    async unblock(blocker: string, blocked: string): Promise<void> {
      await db.execute({
        sql: 'DELETE FROM help_blocks WHERE blocker = ? AND blocked = ?',
        args: [blocker, blocked],
      })
    },

    /** A quién ha bloqueado una persona. */
    async blockedBy(blocker: string): Promise<string[]> {
      const result = await db.execute({
        sql: 'SELECT blocked FROM help_blocks WHERE blocker = ? ORDER BY blocked',
        args: [blocker],
      })

      return result.rows.map((row) => toText(row.blocked))
    },

    /** Quién ha bloqueado a una persona. */
    async blockersOf(blocked: string): Promise<string[]> {
      const result = await db.execute({
        sql: 'SELECT blocker FROM help_blocks WHERE blocked = ?',
        args: [blocked],
      })

      return result.rows.map((row) => toText(row.blocker))
    },
  }
}

export type HelpRepository = ReturnType<typeof createHelpRepository>
