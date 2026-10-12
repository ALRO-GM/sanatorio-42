/**
 * Preferencias de quien entra: campus que mira, idioma y título elegido.
 *
 * Solo SQL. Las reglas están en `xp.service.ts`.
 */

import type { Db } from '../../core/db/database.js'
import { nowIso } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'

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

/** Sin señales de vida durante esto, lo siguiente ya es otra sesión. */
const SESSION_GAP_MS = 10 * 60_000

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

    /**
     * Crea el perfil si falta y anota la visita (en `at`, o ahora). Si la
     * anterior fue hace más de `SESSION_GAP_MS`, es que ha vuelto: empieza otra
     * sesión.
     */
    async touch(login: string, at?: string): Promise<void> {
      const now = at ?? nowIso()
      const gone = new Date(Date.parse(now) - SESSION_GAP_MS).toISOString()

      await db.execute({
        // En el `SET`, `seen_at` a secas es todavía el valor de antes.
        sql: `INSERT INTO profiles (login, created_at, seen_at, session_at) VALUES (?, ?, ?, ?)
              ON CONFLICT (login) DO UPDATE SET
                session_at = CASE WHEN session_at IS NULL OR seen_at IS NULL OR seen_at < ?
                                  THEN excluded.seen_at ELSE session_at END,
                seen_at = excluded.seen_at`,
        args: [login, now, now, now, gone],
      })
    },

    /**
     * Quién está conectado (ha dado señales de vida desde `since`), con cuándo
     * empezó su sesión y su última señal. Quien lleva más, primero.
     */
    async online(since: string): Promise<{ login: string; since: string; seenAt: string }[]> {
      const result = await db.execute({
        sql: `SELECT login, session_at, seen_at FROM profiles WHERE seen_at >= ?
              ORDER BY COALESCE(session_at, seen_at), login`,
        args: [since],
      })

      return result.rows.map((row) => ({
        login: toText(row.login),
        since: toText(row.session_at ?? row.seen_at),
        seenAt: toText(row.seen_at),
      }))
    },

    /** Quién ha dado señales de vida desde `since` (ISO): tiene la web abierta. */
    async seenSince(since: string): Promise<Set<string>> {
      const result = await db.execute({
        sql: 'SELECT login FROM profiles WHERE seen_at >= ?',
        args: [since],
      })

      return new Set(result.rows.map((row) => toText(row.login)))
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
