/**
 * Preferencias de quien entra: campus que mira, idioma y título elegido.
 *
 * Solo SQL. Las reglas están en `xp.service.ts`.
 */

import type { Db } from '../../core/db/database.js'
import { nowIso } from '../../core/db/database.js'
import { toNumber } from '../../core/db/rows.js'

export type ProfileRow = {
  login: string
  campusId: number | null
  lang: string | null
  title: string | null
}

export function createProfilesRepository(db: Db) {
  return {
    /** Preferencias de una persona, o `undefined` si nunca ha entrado. */
    async get(login: string): Promise<ProfileRow | undefined> {
      const result = await db.execute({
        sql: 'SELECT login, campus_id, lang, title FROM profiles WHERE login = ?',
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
      },
    ): Promise<void> {
      const now = nowIso()

      await db.execute({
        sql: `INSERT INTO profiles (login, campus_id, lang, title, created_at, seen_at)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT (login) DO UPDATE SET
                campus_id = COALESCE(excluded.campus_id, campus_id),
                lang      = COALESCE(excluded.lang, lang),
                title     = COALESCE(excluded.title, title),
                seen_at   = excluded.seen_at`,
        args: [
          login,
          changes.campusId ?? null,
          changes.lang ?? null,
          changes.title ?? null,
          now,
          now,
        ],
      })
    },
  }
}

export type ProfilesRepository = ReturnType<typeof createProfilesRepository>
