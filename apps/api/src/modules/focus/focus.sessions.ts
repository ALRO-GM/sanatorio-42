/**
 * El registro de sesiones del Pomodoro (#80 del buzón): una fila por sesión
 * empezada, con cómo acabó. De aquí salen las estadísticas de cada cual y las
 * del panel; las reglas de cómo se cuentan están en `focus.rules.ts`.
 */

import type { FocusReason } from '@sanatorio/contracts'

import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { REASONS } from './focus.rules.js'
import type { FocusOutcome, FocusSession } from './focus.rules.js'

const OUTCOMES: readonly FocusOutcome[] = ['completed', 'cancelled', 'replaced']

/** Los motivos guardados en JSON, sin lo que no sea un motivo conocido. */
function reasonsOf(value: unknown): FocusReason[] {
  try {
    const list: unknown = JSON.parse(toText(value))

    return Array.isArray(list)
      ? list.filter((one): one is FocusReason => (REASONS as readonly unknown[]).includes(one))
      : []
  } catch {
    return []
  }
}

function sessionOf(row: Record<string, unknown>): FocusSession {
  const outcome = toText(row.outcome)
  const ended = toText(row.ended_at)

  return {
    login: toText(row.login),
    startedAt: Date.parse(toText(row.started_at)),
    plannedS: toNumber(row.planned_s),
    endedAt: ended === '' ? null : Date.parse(ended),
    outcome: (OUTCOMES as readonly string[]).includes(outcome) ? (outcome as FocusOutcome) : null,
    reasons: reasonsOf(row.reasons),
    stays: toNumber(row.stays),
    stayReasons: reasonsOf(row.stay_reasons),
  }
}

const COLUMNS = 'id, login, started_at, planned_s, ended_at, outcome, reasons, stays, stay_reasons'

export function createSessionLog(db: Db) {
  return {
    /** La última sesión de esa persona que no tiene final guardado, si la hay. */
    async latestOpen(login: string): Promise<{ id: number; session: FocusSession } | null> {
      const result = await db.execute({
        sql: `SELECT ${COLUMNS} FROM focus_sessions WHERE login = ? AND outcome IS NULL
              ORDER BY started_at DESC, id DESC LIMIT 1`,
        args: [login],
      })
      const row = result.rows[0]

      return row === undefined ? null : { id: toNumber(row.id), session: sessionOf(row) }
    },

    async open(login: string, startedAt: string, plannedS: number): Promise<void> {
      await db.execute({
        sql: 'INSERT INTO focus_sessions (login, started_at, planned_s) VALUES (?, ?, ?)',
        args: [login, startedAt, plannedS],
      })
    },

    async close(
      id: number,
      endedAt: string,
      outcome: FocusOutcome,
      reasons: readonly FocusReason[],
    ): Promise<void> {
      await db.execute({
        sql: 'UPDATE focus_sessions SET ended_at = ?, outcome = ?, reasons = ? WHERE id = ?',
        args: [endedAt, outcome, JSON.stringify(reasons), id],
      })
    },

    /** Quiso acabar y siguió: una vez más, con los motivos que marcó. */
    async stay(id: number, session: FocusSession, reasons: readonly FocusReason[]): Promise<void> {
      await db.execute({
        sql: 'UPDATE focus_sessions SET stays = ?, stay_reasons = ? WHERE id = ?',
        args: [session.stays + 1, JSON.stringify([...session.stayReasons, ...reasons]), id],
      })
    },

    /** Las sesiones empezadas entre esos dos instantes ISO (`from` incluido); sin `from`, desde siempre. */
    async between(from: string | null, to: string): Promise<FocusSession[]> {
      const result = await db.execute({
        sql: `SELECT ${COLUMNS} FROM focus_sessions WHERE started_at >= ? AND started_at < ?`,
        args: [from ?? '', to],
      })

      return result.rows.map(sessionOf)
    },
  }
}

export type SessionLog = ReturnType<typeof createSessionLog>
