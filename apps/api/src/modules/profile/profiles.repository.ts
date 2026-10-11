/**
 * Preferencias de quien entra: campus que mira, idioma y título elegido.
 *
 * Solo SQL. Las reglas están en `xp.service.ts`.
 */

import type { Db } from '../../core/db/database.js'
import { nowIso } from '../../core/db/database.js'
import { toNumber } from '../../core/db/rows.js'

/** Pace y plazo del milestone que alguien ha copiado de su perfil de la intra. */
export type PaceRefRow = {
  pace: number
  circle: number
  /** `YYYY-MM-DD`. */
  deadline: string
  updatedAt: string
}

export type ProfileRow = {
  login: string
  campusId: number | null
  lang: string | null
  title: string | null
  /** Se ofrece a preevaluar proyectos terminados. */
  preReview: boolean
}

export function createProfilesRepository(db: Db) {
  return {
    /** Preferencias de una persona, o `undefined` si nunca ha entrado. */
    async get(login: string): Promise<ProfileRow | undefined> {
      const result = await db.execute({
        sql: 'SELECT login, campus_id, lang, title, pre_review FROM profiles WHERE login = ?',
        args: [login],
      })
      const row = result.rows[0]

      if (row === undefined) {
        return undefined
      }

      return {
        login,
        campusId: row.campus_id === null ? null : toNumber(row.campus_id),
        lang: typeof row.lang === 'string' ? row.lang : null,
        title: typeof row.title === 'string' ? row.title : null,
        preReview: toNumber(row.pre_review) === 1,
      }
    },

    /** Crea el perfil si falta y anota la visita. */
    async touch(login: string): Promise<void> {
      const now = nowIso()

      await db.execute({
        sql: `INSERT INTO profiles (login, created_at, seen_at) VALUES (?, ?, ?)
              ON CONFLICT (login) DO UPDATE SET seen_at = excluded.seen_at`,
        args: [login, now, now],
      })
    },

    /** Cambia solo las preferencias que vengan; `undefined` no toca la columna. */
    async update(
      login: string,
      changes: {
        campusId?: number | undefined
        lang?: string | undefined
        title?: string | undefined
        preReview?: boolean | undefined
      },
    ): Promise<void> {
      const now = nowIso()
      // `null` deja la columna como estaba.
      const flag = changes.preReview === undefined ? null : Number(changes.preReview)

      await db.execute({
        sql: `INSERT INTO profiles (login, campus_id, lang, title, pre_review, created_at, seen_at)
              VALUES (?, ?, ?, ?, COALESCE(?, 0), ?, ?)
              ON CONFLICT (login) DO UPDATE SET
                campus_id = COALESCE(excluded.campus_id, campus_id),
                lang      = COALESCE(excluded.lang, lang),
                title     = COALESCE(excluded.title, title),
                pre_review = COALESCE(?, pre_review),
                seen_at   = excluded.seen_at`,
        args: [
          login,
          changes.campusId ?? null,
          changes.lang ?? null,
          changes.title ?? null,
          flag,
          now,
          now,
          flag,
        ],
      })
    },

    /** El pace y el plazo que anotó una persona, o `undefined` si no lo ha hecho. */
    async paceRef(login: string): Promise<PaceRefRow | undefined> {
      const result = await db.execute({
        sql: 'SELECT pace, circle, deadline, updated_at FROM pace_refs WHERE login = ?',
        args: [login],
      })
      const row = result.rows[0]

      if (row === undefined) {
        return undefined
      }

      return {
        pace: toNumber(row.pace),
        circle: toNumber(row.circle),
        deadline: typeof row.deadline === 'string' ? row.deadline : '',
        updatedAt: typeof row.updated_at === 'string' ? row.updated_at : '',
      }
    },

    /** Anota (o sustituye) el pace y el plazo de una persona. */
    async savePaceRef(login: string, ref: Omit<PaceRefRow, 'updatedAt'>): Promise<void> {
      await db.execute({
        sql: `INSERT INTO pace_refs (login, pace, circle, deadline, updated_at)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT (login) DO UPDATE SET
                pace = excluded.pace,
                circle = excluded.circle,
                deadline = excluded.deadline,
                updated_at = excluded.updated_at`,
        args: [login, ref.pace, ref.circle, ref.deadline, nowIso()],
      })
    },
  }
}

export type ProfilesRepository = ReturnType<typeof createProfilesRepository>
