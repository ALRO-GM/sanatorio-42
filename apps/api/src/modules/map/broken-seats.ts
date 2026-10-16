/**
 * Puestos que no funcionan. Solo SQL.
 *
 * Un aviso vale `BROKEN_FOR_MS`: pasado ese tiempo el puesto se da por
 * arreglado aunque nadie lo diga.
 */

import type { Db } from '../../core/db/database.js'
import { toText } from '../../core/db/rows.js'

/** Lo que dura un aviso de puesto roto. */
export const BROKEN_FOR_MS = 7 * 24 * 3_600_000

/** Avisos a la vez que puede tener una persona: lo justo para no llenar el mapa de cruces. */
export const MAX_BROKEN_PER_PERSON = 10

export function createBrokenSeats(db: Db) {
  return {
    /** Los puestos rotos de un campus avisados desde `since` (ISO): quién y cuándo. */
    async listSince(
      campusId: number,
      since: string,
    ): Promise<Map<string, { by: string; at: string }>> {
      const result = await db.execute({
        sql: `SELECT host, login, reported_at FROM broken_seats
              WHERE campus_id = ? AND reported_at >= ?`,
        args: [campusId, since],
      })

      return new Map(
        result.rows.map((row) => [
          toText(row.host),
          { by: toText(row.login), at: toText(row.reported_at) },
        ]),
      )
    },

    /** Avisos vigentes de una persona, en todos los campus. */
    async countBy(login: string, since: string): Promise<number> {
      const result = await db.execute({
        sql: 'SELECT COUNT(*) AS n FROM broken_seats WHERE login = ? AND reported_at >= ?',
        args: [login, since],
      })

      return Number(result.rows[0]?.n ?? 0)
    },

    /** Lo marca como roto ahora (si ya lo estaba, vuelve a contar desde ahora). */
    async report(campusId: number, host: string, login: string, at: string): Promise<void> {
      await db.execute({
        sql: `INSERT INTO broken_seats (campus_id, host, login, reported_at) VALUES (?, ?, ?, ?)
              ON CONFLICT (campus_id, host) DO UPDATE
                SET login = excluded.login, reported_at = excluded.reported_at`,
        args: [campusId, host, login, at],
      })
    },

    async clear(campusId: number, host: string): Promise<void> {
      await db.execute({
        sql: 'DELETE FROM broken_seats WHERE campus_id = ? AND host = ?',
        args: [campusId, host],
      })
    },
  }
}

export type BrokenSeats = ReturnType<typeof createBrokenSeats>
