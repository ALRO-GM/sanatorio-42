/**
 * Exámenes: lo que se lee de la réplica para sus estadísticas. Solo SQL.
 */

import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { inList, listArg } from '../../core/db/sql.js'
import type { AttemptRow, ExamRow, MemberRow, OccurrenceRow, PlanRow } from './exams.rules.js'

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
     * De esos logins, los que se sabe que son de otro campus y no de este. Quien
     * no consta en ninguno no entra: puede ser alguien que aún no se ha copiado.
     */
    async fromElsewhere(campusId: number, logins: readonly string[]): Promise<Set<string>> {
      if (logins.length === 0) return new Set()

      const result = await db.execute({
        sql: `SELECT u.login FROM users u
              JOIN campus_members cm ON cm.user_id = u.id
              WHERE u.login IN (SELECT value FROM json_each(?))
              GROUP BY u.login
              HAVING MAX(cm.campus_id = ?) = 0`,
        args: [JSON.stringify(logins), campusId],
      })

      return new Set(result.rows.map((row) => toText(row.login)))
    },

    /**
     * La nota del último intento cerrado de antes de `before` de esas personas,
     * por `login:proyecto`: lo que se ve en su expediente.
     */
    async lastClosedMarks(
      logins: readonly string[],
      before: string,
    ): Promise<Map<string, number | null>> {
      const marks = new Map<string, number | null>()

      if (logins.length === 0) return marks

      const result = await db.execute({
        sql: `SELECT u.login, a.project_id, a.mark FROM exam_attempts a
              JOIN users u ON u.id = a.user_id
              WHERE u.login IN (SELECT value FROM json_each(?))
                AND a.validated IS NOT NULL AND a.at < ?
              ORDER BY a.at`,
        args: [JSON.stringify(logins), before],
      })

      // Por fecha: el último pisa a los anteriores.
      for (const row of result.rows) {
        marks.set(
          `${toText(row.login)}:${String(toNumber(row.project_id))}`,
          row.mark === null ? null : toNumber(row.mark),
        )
      }

      return marks
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
              WHERE ${inList('pu.project_id')}
                 OR p.slug LIKE 'python-module%' OR p.slug LIKE '42next-%'`,
        args: [campusId, listArg(ids)],
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
