/**
 * Cambios de guía con responsables: quién propuso y quién validó cada uno,
 * quién lo ha señalado después y las faltas que acumula cada persona. Solo SQL.
 *
 * Las fechas llegan del servicio (y no de `nowIso()`) porque de ellas dependen
 * los plazos: así los tests pueden mover el reloj.
 */

import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import type { GuideSection } from './doubts.repository.js'

type ChangeRow = {
  id: number
  campusId: number
  projectId: number
  section: GuideSection
  body: string
  proposer: string
  validator: string
  /** `true` si se dio XP por él (y por tanto hay XP que retirar si se anula). */
  rewarded: boolean
  acceptedAt: string
  revokedAt: string | null
  /** Logins de quienes lo han señalado. */
  flaggedBy: string[]
}

/** A quién se le apunta una falta: a quien propuso o a quien validó. */
export type StrikeRole = 'proposer' | 'validator'

export function createGuideChangesRepository(db: Db) {
  async function withFlags(rows: Record<string, unknown>[]): Promise<ChangeRow[]> {
    const ids = rows.map((row) => toNumber(row.id))
    const flags = new Map<number, string[]>()

    if (ids.length > 0) {
      const result = await db.execute({
        sql: `SELECT change_id, login FROM guide_change_flags
              WHERE change_id IN (${ids.map(() => '?').join(', ')}) ORDER BY created_at`,
        args: ids,
      })

      for (const row of result.rows) {
        const id = toNumber(row.change_id)
        flags.set(id, [...(flags.get(id) ?? []), toText(row.login)])
      }
    }

    return rows.map((row) => ({
      id: toNumber(row.id),
      campusId: toNumber(row.campus_id),
      projectId: toNumber(row.project_id),
      section: toText(row.section) as GuideSection,
      body: toText(row.body),
      proposer: toText(row.proposer),
      validator: toText(row.validator),
      rewarded: toNumber(row.rewarded) === 1,
      acceptedAt: toText(row.accepted_at),
      revokedAt: typeof row.revoked_at === 'string' ? row.revoked_at : null,
      flaggedBy: flags.get(toNumber(row.id)) ?? [],
    }))
  }

  return {
    async add(change: {
      campusId: number
      projectId: number
      section: GuideSection
      body: string
      proposer: string
      validator: string
      rewarded: boolean
      at: string
    }): Promise<number> {
      const result = await db.execute({
        sql: `INSERT INTO guide_changes
                (campus_id, project_id, section, body, proposer, validator, rewarded, accepted_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          change.campusId,
          change.projectId,
          change.section,
          change.body,
          change.proposer,
          change.validator,
          change.rewarded ? 1 : 0,
          change.at,
        ],
      })

      return toNumber(result.lastInsertRowid)
    },

    async get(id: number): Promise<ChangeRow | undefined> {
      const result = await db.execute({
        sql: 'SELECT * FROM guide_changes WHERE id = ?',
        args: [id],
      })

      return (await withFlags(result.rows))[0]
    },

    /** Cambios en vigor de un proyecto aceptados desde `since`, del más nuevo al más viejo. */
    async recent(campusId: number, projectId: number, since: string): Promise<ChangeRow[]> {
      const result = await db.execute({
        sql: `SELECT * FROM guide_changes
              WHERE campus_id = ? AND project_id = ? AND revoked_at IS NULL AND accepted_at >= ?
              ORDER BY accepted_at DESC, id DESC`,
        args: [campusId, projectId, since],
      })

      return withFlags(result.rows)
    },

    /**
     * Apunta que alguien señala un cambio.
     *
     * @returns Cuántas personas lo han señalado ya, o `undefined` si esta ya lo había hecho.
     */
    async flag(changeId: number, login: string, at: string): Promise<number | undefined> {
      const inserted = await db.execute({
        sql: 'INSERT OR IGNORE INTO guide_change_flags (change_id, login, created_at) VALUES (?, ?, ?)',
        args: [changeId, login, at],
      })

      if (inserted.rowsAffected === 0) {
        return undefined
      }

      const result = await db.execute({
        sql: 'SELECT COUNT(*) AS total FROM guide_change_flags WHERE change_id = ?',
        args: [changeId],
      })

      return toNumber(result.rows[0]?.total)
    },

    async revoke(id: number, at: string): Promise<void> {
      await db.execute({
        sql: 'UPDATE guide_changes SET revoked_at = ? WHERE id = ?',
        args: [at, id],
      })
    },

    /** `true` si a esa pareja ya se le dio XP por un cambio desde `since`. */
    async pairRewardedSince(proposer: string, validator: string, since: string): Promise<boolean> {
      const result = await db.execute({
        sql: `SELECT 1 FROM guide_changes
              WHERE proposer = ? AND validator = ? AND rewarded = 1 AND accepted_at >= ? LIMIT 1`,
        args: [proposer, validator, since],
      })

      return result.rows.length > 0
    },

    async addStrike(login: string, role: StrikeRole, at: string): Promise<void> {
      await db.execute({
        sql: 'INSERT INTO guide_strikes (login, role, created_at) VALUES (?, ?, ?)',
        args: [login, role, at],
      })
    },

    /** Fechas de las faltas de alguien en ese papel, de la más vieja a la más nueva. */
    async strikes(login: string, role: StrikeRole): Promise<string[]> {
      const result = await db.execute({
        sql: 'SELECT created_at FROM guide_strikes WHERE login = ? AND role = ? ORDER BY created_at, id',
        args: [login, role],
      })

      return result.rows.map((row) => toText(row.created_at))
    },
  }
}

export type GuideChangesRepository = ReturnType<typeof createGuideChangesRepository>
