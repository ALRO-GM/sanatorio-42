/**
 * Valoraciones de las correcciones de 42. Solo SQL.
 *
 * A quién se valora no se guarda: sale de `corrections`. Quien fue corregido
 * valora a quien le corrigió (la fila de `corrections` con `corrected = rater`);
 * quien corrigió, a todas las personas de esa corrección (`corrector = rater`).
 */

import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'

/** Desde qué lado valora alguien una corrección. */
export type FeedbackRole = 'corrector' | 'corrected'

/** Una corrección reciente de alguien, como sale de `corrections`. */
export type RecentCorrection = {
  id: number
  corrector: string
  corrected: string
  projectId: number | null
  beginAt: string
}

/** Lo que alguien ha hecho ya con una corrección: contestar, aplazarla o descartarla. */
type FeedbackState = {
  answered: boolean
  postponed: number
  snoozedUntil: string | null
  dismissed: boolean
}

/** Para `campus_id IN (SELECT value FROM json_each(?))`. */
const IN_CAMPUSES = 'campus_id IN (SELECT value FROM json_each(?))'

const toRecent = (row: Record<string, unknown>): RecentCorrection => ({
  id: toNumber(row.id),
  corrector: toText(row.corrector),
  corrected: toText(row.corrected),
  projectId: row.project_id === null ? null : toNumber(row.project_id),
  beginAt: toText(row.begin_at),
})

/**
 * Las tres cuentas que se enseñan, cada una vista desde la persona valorada:
 * qué columna se cuenta, quién valoró y cómo se llega desde su fila de
 * `corrections` a la persona valorada. Todo son constantes: nada viene de fuera.
 */
const TALLIES = {
  /** Reacciones que deja a quien corrigió la gente corregida. */
  reactions: { column: 'tag', role: 'corrected', rater: 'c.corrected', about: 'c.corrector' },
  /** Cómo llegó quien fue corregido, según quien corrigió. */
  tags: { column: 'tag', role: 'corrector', rater: 'c.corrector', about: 'c.corrected' },
  /** Qué tal entendió el problema la gente a la que corrigió alguien. */
  understanding: {
    column: 'understanding',
    role: 'corrected',
    rater: 'c.corrected',
    about: 'c.corrector',
  },
} as const

export function createFeedbackRepository(db: Db) {
  return {
    /**
     * Las correcciones de alguien (hechas o recibidas) que empezaron entre dos
     * instantes. Solo hay correcciones con nota: las que ya se han hecho.
     *
     * Filtra primero por campus y fecha, que es el índice de `corrections`: el
     * pulso lo pregunta a menudo y no debe recorrer el histórico entero.
     */
    async recentOf(
      login: string,
      campusIds: readonly number[],
      from: string,
      to: string,
    ): Promise<RecentCorrection[]> {
      const result = await db.execute({
        sql: `SELECT id, corrector, corrected, project_id, begin_at FROM corrections
              WHERE ${IN_CAMPUSES} AND begin_at >= ? AND begin_at <= ?
                AND (corrector = ? OR corrected = ?) AND corrector <> corrected
              ORDER BY begin_at DESC, id DESC, corrected`,
        args: [JSON.stringify(campusIds), from, to, login, login],
      })

      return result.rows.map(toRecent)
    },

    /** Las filas de una corrección: una por persona corregida. */
    async correction(id: number): Promise<RecentCorrection[]> {
      const result = await db.execute({
        sql: `SELECT id, corrector, corrected, project_id, begin_at FROM corrections
              WHERE id = ? AND corrector <> corrected`,
        args: [id],
      })

      return result.rows.map(toRecent)
    },

    /** Lo que esa persona ha hecho con cada una de esas correcciones. */
    async statesOf(rater: string, ids: readonly number[]): Promise<Map<number, FeedbackState>> {
      if (ids.length === 0) {
        return new Map()
      }

      const result = await db.execute({
        sql: `SELECT correction_id, created_at, postponed, snoozed_until, dismissed
              FROM correction_feedback
              WHERE rater = ? AND correction_id IN (SELECT value FROM json_each(?))`,
        args: [rater, JSON.stringify(ids)],
      })

      return new Map(
        result.rows.map((row) => [
          toNumber(row.correction_id),
          {
            answered: row.created_at !== null,
            postponed: toNumber(row.postponed),
            snoozedUntil: typeof row.snoozed_until === 'string' ? row.snoozed_until : null,
            dismissed: toNumber(row.dismissed) === 1,
          },
        ]),
      )
    },

    /**
     * Guarda la respuesta, si no la había ya.
     *
     * @returns `false` si ya había contestado (aunque fuera en otra pestaña a la vez).
     */
    async answer(
      id: number,
      rater: string,
      role: FeedbackRole,
      understanding: string | null,
      tag: string | null,
      at: string,
    ): Promise<boolean> {
      const result = await db.execute({
        sql: `INSERT INTO correction_feedback (correction_id, rater, role, understanding, tag, created_at)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT (correction_id, rater) DO UPDATE SET
                role = excluded.role,
                understanding = excluded.understanding,
                tag = excluded.tag,
                created_at = excluded.created_at
              WHERE correction_feedback.created_at IS NULL`,
        args: [id, rater, role, understanding, tag, at],
      })

      return result.rowsAffected > 0
    },

    /** «Ahora no»: una vez más aplazada, y sin preguntar hasta `until`. */
    async postpone(id: number, rater: string, role: FeedbackRole, until: string): Promise<void> {
      await db.execute({
        sql: `INSERT INTO correction_feedback (correction_id, rater, role, postponed, snoozed_until)
              VALUES (?, ?, ?, 1, ?)
              ON CONFLICT (correction_id, rater) DO UPDATE SET
                postponed = correction_feedback.postponed + 1,
                snoozed_until = excluded.snoozed_until
              WHERE correction_feedback.created_at IS NULL`,
        args: [id, rater, role, until],
      })
    },

    /** «No volver a preguntar». */
    async dismiss(id: number, rater: string, role: FeedbackRole): Promise<void> {
      await db.execute({
        sql: `INSERT INTO correction_feedback (correction_id, rater, role, dismissed)
              VALUES (?, ?, ?, 1)
              ON CONFLICT (correction_id, rater) DO UPDATE SET dismissed = 1
              WHERE correction_feedback.created_at IS NULL`,
        args: [id, rater, role],
      })
    },

    /**
     * Una de las cuentas de `TALLIES` sobre una persona: cuántas veces sale cada
     * valor. Nunca dice quién lo eligió.
     */
    async tally(kind: keyof typeof TALLIES, about: string): Promise<Map<string, number>> {
      const spec = TALLIES[kind]
      const result = await db.execute({
        sql: `SELECT f.${spec.column} AS value, COUNT(*) AS total FROM correction_feedback f
              JOIN corrections c ON c.id = f.correction_id AND ${spec.rater} = f.rater
              WHERE f.role = ? AND f.${spec.column} IS NOT NULL AND ${spec.about} = ?
              GROUP BY f.${spec.column}`,
        args: [spec.role, about],
      })

      return new Map(result.rows.map((row) => [toText(row.value), toNumber(row.total)]))
    },
  }
}

export type FeedbackRepository = ReturnType<typeof createFeedbackRepository>
