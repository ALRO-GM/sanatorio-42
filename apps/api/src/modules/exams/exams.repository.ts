/**
 * Exámenes: lo que se lee de la réplica para sus estadísticas. Solo SQL.
 */

import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import type { AttemptRow, MemberRow, OccurrenceRow, PlanRow } from './exams.rules.js'

/**
 * Los exámenes del common core: los Exam Rank, del plan clásico
 * (`exam-rank-02`) y del nuevo (`42next-exam-rank-02`). Los de la piscina y
 * los de pruebas no cuentan.
 */
const EXAM_PROJECT = `(p.slug LIKE 'exam-rank-%' OR p.slug LIKE '42next-exam-rank-%')`

/** Lista de fechas guardada como JSON. Vacía si no se puede leer. */
function parseDates(value: unknown): string[] {
  try {
    const read: unknown = JSON.parse(toText(value))

    return Array.isArray(read) ? read.filter((date) => typeof date === 'string') : []
  } catch {
    return []
  }
}

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
     * Toda la gente de un campus, con lo que se sepa de su cursus: inicio y
     * black hole (de quien ha entrado en la web) y plan e hitos (de quien se
     * le han mirado). Antes solo salía quien tenía los hitos.
     */
    async members(campusId: number): Promise<MemberRow[]> {
      const result = await db.execute({
        sql: `SELECT u.id, u.login, u.image, ul.begin_at, ul.blackholed_at,
                     ul.login IS NOT NULL AS asked, ut.track, ut.ranks
              FROM campus_members cm
              JOIN users u ON u.id = cm.user_id
              LEFT JOIN user_levels ul ON ul.login = u.login
              LEFT JOIN user_tracks ut ON ut.login = u.login
              WHERE cm.campus_id = ?`,
        args: [campusId],
      })

      return result.rows.map((row) => ({
        userId: toNumber(row.id),
        login: toText(row.login),
        image: typeof row.image === 'string' ? row.image : null,
        beginAt: typeof row.begin_at === 'string' ? row.begin_at : null,
        blackholedAt: typeof row.blackholed_at === 'string' ? row.blackholed_at : null,
        asked: toNumber(row.asked) === 1,
        track: row.track === 'classic' || row.track === 'next' ? row.track : null,
        ranks: row.track === null || row.track === undefined ? null : parseDates(row.ranks),
      }))
    },

    /**
     * Los proyectos del common core de la gente de un campus (para saber cuándo
     * empezó quien no tiene fecha de inicio, y en qué círculo va), más los de
     * Python y `42next`, que dicen de qué plan es quien no se sabe.
     */
    async planRows(campusId: number, ids: readonly number[]): Promise<PlanRow[]> {
      const result = await db.execute({
        sql: `SELECT pu.user_id, pu.project_id, pu.created_at_42, pu.updated_at_42, p.slug
              FROM project_users pu
              JOIN campus_members cm ON cm.user_id = pu.user_id AND cm.campus_id = ?
              JOIN projects p ON p.id = pu.project_id
              WHERE pu.project_id IN (${ids.length === 0 ? 'NULL' : ids.map(() => '?').join(', ')})
                 OR p.slug LIKE 'python-module%' OR p.slug LIKE '42next-%'`,
        args: [campusId, ...ids],
      })

      return result.rows.map((row) => ({
        userId: toNumber(row.user_id),
        projectId: toNumber(row.project_id),
        createdAt: typeof row.created_at_42 === 'string' ? row.created_at_42 : null,
        updatedAt: typeof row.updated_at_42 === 'string' ? row.updated_at_42 : null,
        slug: typeof row.slug === 'string' ? row.slug : '',
      }))
    },
  }
}

export type ExamsRepository = ReturnType<typeof createExamsRepository>
