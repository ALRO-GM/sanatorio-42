/**
 * Exámenes: lo que se lee de la réplica para sus estadísticas. Solo SQL.
 */

import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import type { AttemptRow, ExamRow, OccurrenceRow } from './exams.rules.js'

/**
 * Los exámenes del common core: los Exam Rank, del plan clásico
 * (`exam-rank-02`) y del nuevo (`42next-exam-rank-02`). Los de la piscina y
 * los de pruebas no cuentan.
 */
const EXAM_PROJECT = `(p.slug LIKE 'exam-rank-%' OR p.slug LIKE '42next-exam-rank-%')`

const triState = (value: unknown): boolean | null =>
  value === null || value === undefined ? null : toNumber(value) === 1

export function createExamsRepository(db: Db) {
  return {
    /** Los exámenes que se conocen, por nombre. */
    async exams(): Promise<{ id: number; name: string; slug: string }[]> {
      const result = await db.execute(
        `SELECT p.id, p.name, p.slug FROM projects p WHERE ${EXAM_PROJECT} ORDER BY p.name, p.slug`,
      )

      // Los dos planes los llaman igual: el del nuevo lleva su marca.
      return result.rows.map((row) => ({
        id: toNumber(row.id),
        name: toText(row.slug).startsWith('42next-')
          ? `${toText(row.name)} · 42next`
          : toText(row.name),
        slug: toText(row.slug),
      }))
    },

    /**
     * Quién tiene apuntado ese examen en su agenda de 42 (la que se copia al
     * abrir el calendario). Completa la lista de 42 si esa no se pudo pedir.
     */
    async agendaRegistered(examId: number): Promise<string[]> {
      const result = await db.execute({
        sql: `SELECT login FROM agenda_users
              WHERE EXISTS (SELECT 1 FROM json_each(agenda_users.exams) WHERE value = ?)`,
        args: [examId],
      })

      return result.rows.map((row) => toText(row.login))
    },

    /**
     * Las filas de examen tocadas desde `since` de la gente del campus o de esos
     * logins: quien ha entrado en el examen aparece aunque la lista de
     * apuntados no haya llegado. La más reciente de cada cual va la última.
     */
    async sessionRows(
      campusId: number,
      since: string,
      logins: readonly string[],
    ): Promise<(ExamRow & { login: string; projectId: number })[]> {
      const result = await db.execute({
        sql: `SELECT u.login, pu.project_id, pu.status, pu.final_mark, pu.validated, pu.updated_at_42
              FROM project_users pu
              JOIN projects p ON p.id = pu.project_id
              JOIN users u ON u.id = pu.user_id
              LEFT JOIN campus_members cm ON cm.user_id = pu.user_id AND cm.campus_id = ?
              WHERE ${EXAM_PROJECT} AND pu.updated_at_42 >= ?
                AND (cm.user_id IS NOT NULL OR u.login IN (SELECT value FROM json_each(?)))
              ORDER BY pu.updated_at_42`,
        args: [campusId, since, JSON.stringify(logins)],
      })

      return result.rows.map((row) => ({
        login: toText(row.login),
        projectId: toNumber(row.project_id),
        status: toText(row.status),
        finalMark: row.final_mark === null ? null : toNumber(row.final_mark),
        validated: triState(row.validated),
        updatedAt: typeof row.updated_at_42 === 'string' ? row.updated_at_42 : null,
      }))
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
