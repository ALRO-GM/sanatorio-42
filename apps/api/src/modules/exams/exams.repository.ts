/**
 * Exámenes: lo que se lee de la réplica para sus estadísticas. Solo SQL.
 */

import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import type { AttemptRow, OccurrenceRow } from './exams.rules.js'

/** Los proyectos que son exámenes, por su nombre o su slug. */
const EXAM_PROJECT = `(p.slug LIKE '%exam%' OR p.name LIKE 'Exam%')`

const triState = (value: unknown): boolean | null =>
  value === null || value === undefined ? null : toNumber(value) === 1

export function createExamsRepository(db: Db) {
  return {
    /** Los exámenes que se conocen, por nombre. */
    async exams(): Promise<{ id: number; name: string }[]> {
      const result = await db.execute(
        `SELECT p.id, p.name FROM projects p WHERE ${EXAM_PROJECT} ORDER BY p.name`,
      )

      return result.rows.map((row) => ({ id: toNumber(row.id), name: toText(row.name) }))
    },

    /** Los intentos guardados de la gente de un campus. */
    async attempts(campusId: number): Promise<AttemptRow[]> {
      const result = await db.execute({
        sql: `SELECT a.user_id, a.project_id, a.mark, a.validated, a.at FROM exam_attempts a
              JOIN campus_members cm ON cm.user_id = a.user_id AND cm.campus_id = ?`,
        args: [campusId],
      })

      return result.rows.map((row) => ({
        userId: toNumber(row.user_id),
        projectId: toNumber(row.project_id),
        mark: row.mark === null ? null : toNumber(row.mark),
        validated: triState(row.validated),
        at: typeof row.at === 'string' ? row.at : null,
      }))
    },

    /** Las filas de examen de la gente de un campus: si aprobó y cuántas veces reintentó. */
    async occurrences(campusId: number): Promise<OccurrenceRow[]> {
      const result = await db.execute({
        sql: `SELECT pu.user_id, pu.project_id, pu.validated, pu.occurrence FROM project_users pu
              JOIN projects p ON p.id = pu.project_id
              JOIN campus_members cm ON cm.user_id = pu.user_id AND cm.campus_id = ?
              WHERE ${EXAM_PROJECT}`,
        args: [campusId],
      })

      return result.rows.map((row) => ({
        userId: toNumber(row.user_id),
        projectId: toNumber(row.project_id),
        validated: triState(row.validated),
        occurrence: row.occurrence === null ? null : toNumber(row.occurrence),
      }))
    },

    /**
     * Cuándo empezó y cuándo validó cada rango la gente de un campus de la que
     * se sabe (quien ha entrado en la web y se le han mirado los hitos).
     */
    async milestones(campusId: number): Promise<{ begin: string | null; ranks: string[] }[]> {
      const result = await db.execute({
        sql: `SELECT ut.ranks, ul.begin_at FROM user_tracks ut
              JOIN users u ON u.login = ut.login
              JOIN campus_members cm ON cm.user_id = u.id AND cm.campus_id = ?
              LEFT JOIN user_levels ul ON ul.login = ut.login`,
        args: [campusId],
      })

      return result.rows.map((row) => {
        let ranks: string[] = []

        try {
          const read: unknown = JSON.parse(toText(row.ranks))

          ranks = Array.isArray(read) ? read.filter((date) => typeof date === 'string') : []
        } catch {
          ranks = []
        }

        return { begin: typeof row.begin_at === 'string' ? row.begin_at : null, ranks }
      })
    },
  }
}

export type ExamsRepository = ReturnType<typeof createExamsRepository>
