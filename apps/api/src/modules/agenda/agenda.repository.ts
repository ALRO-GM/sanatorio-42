/**
 * La agenda en la base (`docs/agenda.md`): metas, checkpoints y dailies o
 * weeklies. Solo SQL; las reglas están en el servicio.
 */

import type {
  AgendaCheckpoint,
  AgendaCheckpointKey,
  AgendaEntry,
  AgendaEntryKind,
  AgendaGoalStatus,
  AgendaOutcome,
  AgendaProblem,
  AgendaProjectKind,
  AgendaSolution,
} from '@sanatorio/contracts'
import { z } from 'zod'

import type { Db } from '../../core/db/database.js'
import { toJson, toNumber, toNumberOrNull, toText, toTextOrNull } from '../../core/db/rows.js'
import { inList, listArg } from '../../core/db/sql.js'

/** Una meta tal y como está guardada, sin sus checkpoints ni entradas. */
export type GoalRow = {
  id: number
  login: string
  campusId: number
  projectId: number
  projectName: string
  projectKind: AgendaProjectKind
  targetDay: string
  progress: number
  note: string | null
  status: AgendaGoalStatus
  createdAt: string
  closedAt: string | null
}

/** Lo que se guarda de un daily o weekly. */
export type EntryWrite = {
  kind: AgendaEntryKind
  day: string
  plan: number[]
  outcome: AgendaOutcome | null
  problem: AgendaProblem | null
  problemOther: string | null
  solution: AgendaSolution | null
  solutionOther: string | null
  progress: number | null
  note: string | null
}

type Row = Record<string, unknown>

const plans = z.array(z.number().int())

const goalOf = (row: Row): GoalRow => ({
  id: toNumber(row.id),
  login: toText(row.login),
  campusId: toNumber(row.campus_id),
  projectId: toNumber(row.project_id),
  projectName: toText(row.project_name),
  projectKind: toText(row.project_kind) as AgendaProjectKind,
  targetDay: toText(row.target_day),
  progress: toNumber(row.progress),
  note: toTextOrNull(row.note),
  status: toText(row.status) as AgendaGoalStatus,
  createdAt: toText(row.created_at),
  closedAt: toTextOrNull(row.closed_at),
})

const checkpointOf = (row: Row): AgendaCheckpoint => ({
  id: toNumber(row.id),
  key: toTextOrNull(row.key) as AgendaCheckpointKey | null,
  text: toTextOrNull(row.text),
  done: row.done_at !== null,
})

const entryOf = (row: Row): AgendaEntry => ({
  id: toNumber(row.id),
  kind: toText(row.kind) as AgendaEntryKind,
  day: toText(row.day),
  plan: toJson(row.plan, plans) ?? [],
  outcome: toTextOrNull(row.outcome) as AgendaOutcome | null,
  problem: toTextOrNull(row.problem) as AgendaProblem | null,
  problemOther: toTextOrNull(row.problem_other),
  solution: toTextOrNull(row.solution) as AgendaSolution | null,
  solutionOther: toTextOrNull(row.solution_other),
  progress: toNumberOrNull(row.progress),
  note: toTextOrNull(row.note),
  updatedAt: toText(row.updated_at),
})

/** Agrupa filas por meta, en el orden en que llegan. */
function byGoal<T>(rows: readonly Row[], map: (row: Row) => T): Map<number, T[]> {
  const grouped = new Map<number, T[]>()

  for (const row of rows) {
    const goalId = toNumber(row.goal_id)

    grouped.set(goalId, [...(grouped.get(goalId) ?? []), map(row)])
  }

  return grouped
}

export function createAgendaRepository(db: Db) {
  return {
    /** Las metas de una persona: activas, o cerradas desde `closedSince`. */
    async goalsOf(login: string, closedSince: string): Promise<GoalRow[]> {
      const result = await db.execute({
        sql: `SELECT * FROM scrum_goals
              WHERE login = ? AND (status = 'active' OR closed_at >= ?)
              ORDER BY status = 'active' DESC, target_day, id`,
        args: [login, closedSince],
      })

      return result.rows.map(goalOf)
    },

    /** La meta, sea de quien sea; el servicio decide quién la ve. */
    async goal(goalId: number): Promise<GoalRow | null> {
      const result = await db.execute({
        sql: 'SELECT * FROM scrum_goals WHERE id = ?',
        args: [goalId],
      })
      const row = result.rows[0]

      return row === undefined ? null : goalOf(row)
    },

    async countActive(login: string): Promise<number> {
      const result = await db.execute({
        sql: `SELECT COUNT(*) AS n FROM scrum_goals WHERE login = ? AND status = 'active'`,
        args: [login],
      })

      return toNumber(result.rows[0]?.n)
    },

    /**
     * La meta más reciente de cada persona para un proyecto, sin las dejadas:
     * es lo que se ve en el tablero de su sprint.
     */
    async latestFor(projectId: number, logins: readonly string[]): Promise<Map<string, GoalRow>> {
      const result = await db.execute({
        sql: `SELECT * FROM scrum_goals
              WHERE project_id = ? AND status != 'dropped' AND ${inList('login')}
              ORDER BY status = 'active', id`,
        args: [projectId, listArg(logins)],
      })
      const found = new Map<string, GoalRow>()

      // Ordenadas para que la última que se pone de cada cual sea la buena:
      // una activa gana a una entregada, y entre iguales, la más nueva.
      for (const goal of result.rows.map(goalOf)) found.set(goal.login, goal)

      return found
    },

    /** Crea la meta con sus checkpoints. Devuelve su id. */
    async create(
      goal: Omit<GoalRow, 'id' | 'status' | 'createdAt' | 'closedAt'>,
      checkpoints: readonly AgendaCheckpointKey[],
      at: string,
    ): Promise<number> {
      const created = await db.execute({
        sql: `INSERT INTO scrum_goals (login, campus_id, project_id, project_name, project_kind,
                target_day, progress, note, status, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?) RETURNING id`,
        args: [
          goal.login,
          goal.campusId,
          goal.projectId,
          goal.projectName,
          goal.projectKind,
          goal.targetDay,
          goal.progress,
          goal.note,
          at,
          at,
        ],
      })
      const goalId = toNumber(created.rows[0]?.id)

      if (checkpoints.length > 0) {
        await db.batch(
          checkpoints.map((key, position) => ({
            sql: `INSERT INTO scrum_checkpoints (goal_id, login, key, position) VALUES (?, ?, ?, ?)`,
            args: [goalId, goal.login, key, position],
          })),
          'write',
        )
      }

      return goalId
    },

    async update(
      goalId: number,
      change: Pick<GoalRow, 'targetDay' | 'progress' | 'note' | 'status' | 'closedAt'>,
      at: string,
    ): Promise<void> {
      await db.execute({
        sql: `UPDATE scrum_goals SET target_day = ?, progress = ?, note = ?, status = ?,
                closed_at = ?, updated_at = ? WHERE id = ?`,
        args: [
          change.targetDay,
          change.progress,
          change.note,
          change.status,
          change.closedAt,
          at,
          goalId,
        ],
      })
    },

    /** Borra la meta con todo lo suyo. */
    async remove(goalId: number): Promise<void> {
      await db.batch(
        [
          { sql: 'DELETE FROM scrum_entries WHERE goal_id = ?', args: [goalId] },
          { sql: 'DELETE FROM scrum_checkpoints WHERE goal_id = ?', args: [goalId] },
          { sql: 'DELETE FROM scrum_goals WHERE id = ?', args: [goalId] },
        ],
        'write',
      )
    },

    /** Los checkpoints de esas metas, en su orden. */
    async checkpointsOf(goalIds: readonly number[]): Promise<Map<number, AgendaCheckpoint[]>> {
      const result = await db.execute({
        sql: `SELECT * FROM scrum_checkpoints WHERE ${inList('goal_id')} ORDER BY position, id`,
        args: [listArg(goalIds)],
      })

      return byGoal(result.rows, checkpointOf)
    },

    /** Las últimas `limit` entradas de cada una de esas metas, lo más reciente primero. */
    async entriesOf(
      goalIds: readonly number[],
      limit: number,
    ): Promise<Map<number, AgendaEntry[]>> {
      const result = await db.execute({
        sql: `SELECT * FROM (
                SELECT e.*, ROW_NUMBER() OVER (
                  PARTITION BY goal_id ORDER BY day DESC, updated_at DESC, id DESC
                ) AS n
                FROM scrum_entries e WHERE ${inList('goal_id')}
              ) WHERE n <= ? ORDER BY day DESC, updated_at DESC, id DESC`,
        args: [listArg(goalIds), limit],
      })

      return byGoal(result.rows, entryOf)
    },

    async addCheckpoint(
      goalId: number,
      login: string,
      checkpoint: { key: AgendaCheckpointKey | null; text: string | null },
    ): Promise<void> {
      await db.execute({
        sql: `INSERT INTO scrum_checkpoints (goal_id, login, key, text, position)
              VALUES (?, ?, ?, ?,
                (SELECT COALESCE(MAX(position), -1) + 1 FROM scrum_checkpoints WHERE goal_id = ?))`,
        args: [goalId, login, checkpoint.key, checkpoint.text, goalId],
      })
    },

    /** Marca o desmarca un checkpoint de la meta. `false` si no es de ella. */
    async markCheckpoint(
      goalId: number,
      checkpointId: number,
      doneAt: string | null,
    ): Promise<boolean> {
      const result = await db.execute({
        sql: 'UPDATE scrum_checkpoints SET done_at = ? WHERE id = ? AND goal_id = ?',
        args: [doneAt, checkpointId, goalId],
      })

      return result.rowsAffected > 0
    },

    /** Quita un checkpoint de la meta. `false` si no es de ella. */
    async removeCheckpoint(goalId: number, checkpointId: number): Promise<boolean> {
      const result = await db.execute({
        sql: 'DELETE FROM scrum_checkpoints WHERE id = ? AND goal_id = ?',
        args: [checkpointId, goalId],
      })

      return result.rowsAffected > 0
    },

    /** Apunta (o reescribe) el daily o weekly de ese día. */
    async saveEntry(goal: GoalRow, entry: EntryWrite, at: string): Promise<void> {
      await db.execute({
        sql: `INSERT INTO scrum_entries (goal_id, login, kind, day, plan, outcome, problem,
                problem_other, solution, solution_other, progress, note, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT (goal_id, kind, day) DO UPDATE SET
                plan = excluded.plan, outcome = excluded.outcome, problem = excluded.problem,
                problem_other = excluded.problem_other, solution = excluded.solution,
                solution_other = excluded.solution_other, progress = excluded.progress,
                note = excluded.note, updated_at = excluded.updated_at`,
        args: [
          goal.id,
          goal.login,
          entry.kind,
          entry.day,
          JSON.stringify(entry.plan),
          entry.outcome,
          entry.problem,
          entry.problemOther,
          entry.solution,
          entry.solutionOther,
          entry.progress,
          entry.note,
          at,
          at,
        ],
      })
    },
  }
}

export type AgendaRepository = ReturnType<typeof createAgendaRepository>
