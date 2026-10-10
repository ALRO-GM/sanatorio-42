/**
 * Libro de XP y reacciones.
 *
 * Nunca se guarda un total: se suma. Las restricciones únicas de las tablas son
 * las que garantizan que nada se cobra dos veces aunque lleguen dos peticiones
 * a la vez.
 */

import type { Db } from '../../core/db/database.js'
import { nowIso } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'

export function createXpRepository(db: Db) {
  return {
    /**
     * Apunta XP una sola vez por `(login, kind, ref)`.
     *
     * @returns `true` si se ha apuntado; `false` si ya estaba.
     */
    async award(login: string, kind: string, amount: number, ref: string): Promise<boolean> {
      const result = await db.execute({
        sql: `INSERT OR IGNORE INTO xp_events (login, kind, amount, ref, created_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [login, kind, amount, ref, nowIso()],
      })

      return result.rowsAffected > 0
    },

    /**
     * Retira un apunte: lo ganado con algo que luego se ha dado por malo.
     *
     * @returns `true` si había algo que retirar.
     */
    async revoke(login: string, kind: string, ref: string): Promise<boolean> {
      const result = await db.execute({
        sql: 'DELETE FROM xp_events WHERE login = ? AND kind = ? AND ref = ?',
        args: [login, kind, ref],
      })

      return result.rowsAffected > 0
    },

    /** Cuántas veces ha ganado alguien una cosa desde un instante. */
    async countSince(login: string, kind: string, since: string): Promise<number> {
      const result = await db.execute({
        sql: `SELECT COUNT(*) AS total FROM xp_events
              WHERE login = ? AND kind = ? AND created_at >= ?`,
        args: [login, kind, since],
      })

      return toNumber(result.rows[0]?.total)
    },

    /**
     * XP por persona de un campus, de mayor a menor, contando solo esos motivos.
     *
     * El campus de cada persona sale de la réplica (`campus_members`).
     */
    async ranking(
      campusId: number,
      kinds: readonly string[],
      since: string | null,
    ): Promise<{ login: string; image: string | null; xp: number }[]> {
      const result = await db.execute({
        sql: `SELECT e.login, u.image, SUM(e.amount) AS xp
              FROM xp_events e
              JOIN users u ON u.login = e.login
              JOIN campus_members m ON m.user_id = u.id AND m.campus_id = ?
              WHERE e.kind IN (${kinds.map(() => '?').join(', ')})
                AND (? IS NULL OR e.created_at >= ?)
              GROUP BY e.login
              HAVING SUM(e.amount) > 0
              ORDER BY xp DESC, e.login`,
        args: [campusId, ...kinds, since, since],
      })

      return result.rows.map((row) => ({
        login: toText(row.login),
        image: typeof row.image === 'string' ? row.image : null,
        xp: toNumber(row.xp),
      }))
    },

    /** XP total de una persona. */
    async total(login: string): Promise<number> {
      const result = await db.execute({
        sql: 'SELECT COALESCE(SUM(amount), 0) AS total FROM xp_events WHERE login = ?',
        args: [login],
      })

      return toNumber(result.rows[0]?.total)
    },

    /** Cuántas veces ha ganado cada cosa. Es de donde salen los logros. */
    async countsByKind(login: string): Promise<Map<string, number>> {
      const result = await db.execute({
        sql: 'SELECT kind, COUNT(*) AS total FROM xp_events WHERE login = ? GROUP BY kind',
        args: [login],
      })

      return new Map(result.rows.map((row) => [toText(row.kind), toNumber(row.total)]))
    },

    /**
     * Guarda una reacción.
     *
     * @returns El id, o `undefined` si esa pareja ya reaccionó hoy.
     */
    async addReaction(reaction: {
      from: string
      to: string
      kind: string
      projectId: number | null
      specialist: boolean
      day: string
    }): Promise<number | undefined> {
      const result = await db.execute({
        sql: `INSERT OR IGNORE INTO reactions
                (from_login, to_login, kind, project_id, specialist, day, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          reaction.from,
          reaction.to,
          reaction.kind,
          reaction.projectId,
          reaction.specialist ? 1 : 0,
          reaction.day,
          nowIso(),
        ],
      })

      return result.rowsAffected > 0 ? toNumber(result.lastInsertRowid) : undefined
    },

    /** Reacciones que ha dado alguien en un día. */
    async reactionsGivenOn(from: string, day: string): Promise<number> {
      const result = await db.execute({
        sql: 'SELECT COUNT(*) AS total FROM reactions WHERE from_login = ? AND day = ?',
        args: [from, day],
      })

      return toNumber(result.rows[0]?.total)
    },

    /** Reacciones recibidas, por tipo. */
    async reactionsReceived(to: string): Promise<Map<string, number>> {
      const result = await db.execute({
        sql: 'SELECT kind, COUNT(*) AS total FROM reactions WHERE to_login = ? GROUP BY kind',
        args: [to],
      })

      return new Map(result.rows.map((row) => [toText(row.kind), toNumber(row.total)]))
    },
  }
}

export type XpRepository = ReturnType<typeof createXpRepository>
