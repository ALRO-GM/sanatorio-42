/**
 * Pizarras y plazas reservadas. Solo SQL.
 */

import type { Db } from '../../core/db/database.js'
import { nowIso } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'

export type BoardRow = {
  id: number
  campusId: number
  host: string
  title: string
  topic: string | null
  description: string | null
  place: string
  startsAt: string
  endsAt: string
  capacity: number
  settled: boolean
  attendees: string[]
}

export function createBoardsRepository(db: Db) {
  async function select(where: string, args: (string | number)[]): Promise<BoardRow[]> {
    const result = await db.execute({
      sql: `SELECT * FROM boards WHERE ${where} ORDER BY starts_at`,
      args,
    })
    const ids = result.rows.map((row) => toNumber(row.id))
    const attendees = new Map<number, string[]>()

    if (ids.length > 0) {
      const rows = await db.execute({
        sql: `SELECT board_id, login FROM board_attendees
              WHERE board_id IN (${ids.map(() => '?').join(', ')}) ORDER BY joined_at`,
        args: ids,
      })

      for (const row of rows.rows) {
        const id = toNumber(row.board_id)
        attendees.set(id, [...(attendees.get(id) ?? []), toText(row.login)])
      }
    }

    return result.rows.map((row) => ({
      id: toNumber(row.id),
      campusId: toNumber(row.campus_id),
      host: toText(row.host),
      title: toText(row.title),
      topic: typeof row.topic === 'string' ? row.topic : null,
      description: typeof row.description === 'string' ? row.description : null,
      place: toText(row.place),
      startsAt: toText(row.starts_at),
      endsAt: toText(row.ends_at),
      capacity: toNumber(row.capacity),
      settled: toNumber(row.settled) === 1,
      attendees: attendees.get(toNumber(row.id)) ?? [],
    }))
  }

  return {
    /** Pizarras de un campus que empiezan dentro de un intervalo. */
    async listBetween(campusId: number, from: string, to: string): Promise<BoardRow[]> {
      return select('campus_id = ? AND starts_at >= ? AND starts_at < ?', [campusId, from, to])
    },

    async get(id: number): Promise<BoardRow | undefined> {
      return (await select('id = ?', [id]))[0]
    },

    /** Pizarras ya terminadas cuyo XP aún no se ha repartido. */
    async unsettledEndedBefore(instant: string): Promise<BoardRow[]> {
      return select('settled = 0 AND ends_at <= ?', [instant])
    },

    async markSettled(id: number): Promise<void> {
      await db.execute({ sql: 'UPDATE boards SET settled = 1 WHERE id = ?', args: [id] })
    },

    async create(board: Omit<BoardRow, 'id' | 'settled' | 'attendees'>): Promise<number> {
      const result = await db.execute({
        sql: `INSERT INTO boards
                (campus_id, host, title, topic, description, place, starts_at, ends_at, capacity, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          board.campusId,
          board.host,
          board.title,
          board.topic,
          board.description,
          board.place,
          board.startsAt,
          board.endsAt,
          board.capacity,
          nowIso(),
        ],
      })

      return toNumber(result.lastInsertRowid)
    },

    /** Reserva plaza **solo si queda**, en una sola sentencia. */
    async join(id: number, login: string): Promise<boolean> {
      const result = await db.execute({
        sql: `INSERT OR IGNORE INTO board_attendees (board_id, login, joined_at)
              SELECT b.id, ?, ? FROM boards b
              WHERE b.id = ?
                AND (SELECT COUNT(*) FROM board_attendees a WHERE a.board_id = b.id) < b.capacity`,
        args: [login, nowIso(), id],
      })

      return result.rowsAffected > 0
    },

    async leave(id: number, login: string): Promise<void> {
      await db.execute({
        sql: 'DELETE FROM board_attendees WHERE board_id = ? AND login = ?',
        args: [id, login],
      })
    },

    async remove(id: number): Promise<void> {
      await db.batch(
        [
          { sql: 'DELETE FROM board_attendees WHERE board_id = ?', args: [id] },
          { sql: 'DELETE FROM boards WHERE id = ?', args: [id] },
        ],
        'write',
      )
    },

    /** Pizarras futuras que ha propuesto alguien. Para el tope por persona. */
    async countUpcomingBy(host: string, from: string): Promise<number> {
      const result = await db.execute({
        sql: 'SELECT COUNT(*) AS total FROM boards WHERE host = ? AND starts_at >= ?',
        args: [host, from],
      })

      return toNumber(result.rows[0]?.total)
    },
  }
}

export type BoardsRepository = ReturnType<typeof createBoardsRepository>
