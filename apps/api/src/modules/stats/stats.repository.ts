/**
 * Las cuentas de las estadísticas de Ayuda, en SQL y solo de lectura, sobre
 * las tablas de cada sección. Todo es del campus que se mira y desde `since`
 * (`null`: desde siempre).
 */

import type { StatsSectionId } from '@sanatorio/contracts'

import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'

export type RankRow = { login: string; image: string | null; value: number; extra: number }

type Query = { sql: string; args: (string | number | null)[] }

/** Cada sección: sus cifras (en una fila, una columna por cifra) y su clasificación. */
type SectionQueries = {
  totals: (campus: number, since: string | null, now: string) => Query
  /** Devuelve `login`, `value` y `extra` por persona. */
  ranking: (campus: number, since: string | null, now: string) => Query
}

const day = (iso: string | null): string | null => (iso === null ? null : iso.slice(0, 10))

const QUERIES: Record<StatsSectionId, SectionQueries> = {
  // Sala de espera: sesiones aceptadas y, de ellas, las validadas con los dos
  // códigos. La clasificación solo cuenta las validadas: son las que valen XP.
  consulta: {
    totals: (campus, since) => ({
      sql: `SELECT COUNT(*) AS sessions,
                   COALESCE(SUM(verified), 0) AS verified,
                   COALESCE(SUM(CASE WHEN verified = 1 THEN minutes ELSE 0 END), 0) AS minutes,
                   COUNT(DISTINCT requester) AS helped
            FROM help_bookings
            WHERE campus_id = ? AND status = 'confirmed' AND (? IS NULL OR day >= ?)`,
      args: [campus, day(since), day(since)],
    }),
    ranking: (campus, since) => ({
      sql: `SELECT helper AS login, COUNT(*) AS value, SUM(minutes) AS extra
            FROM help_bookings
            WHERE campus_id = ? AND status = 'confirmed' AND verified = 1 AND (? IS NULL OR day >= ?)
            GROUP BY helper`,
      args: [campus, day(since), day(since)],
    }),
  },
  // Tablón: dudas, respuestas y resueltas. Clasifica quién da la respuesta
  // que resuelve la duda; desempata cuántas respuestas da.
  tablon: {
    totals: (campus, since) => ({
      sql: `SELECT (SELECT COUNT(*) FROM doubts WHERE campus_id = ? AND (? IS NULL OR created_at >= ?)) AS doubts,
                   (SELECT COUNT(*) FROM doubt_answers a JOIN doubts d ON d.id = a.doubt_id
                     WHERE d.campus_id = ? AND (? IS NULL OR a.created_at >= ?)) AS answers,
                   (SELECT COUNT(*) FROM doubts WHERE campus_id = ? AND solved_at IS NOT NULL
                     AND (? IS NULL OR solved_at >= ?)) AS solved`,
      args: [campus, since, since, campus, since, since, campus, since, since],
    }),
    ranking: (campus, since) => ({
      sql: `SELECT a.author AS login,
                   SUM(CASE WHEN d.solved_answer_id = a.id THEN 1 ELSE 0 END) AS value,
                   COUNT(*) AS extra
            FROM doubt_answers a JOIN doubts d ON d.id = a.doubt_id
            WHERE d.campus_id = ? AND a.author != d.author AND (? IS NULL OR a.created_at >= ?)
            GROUP BY a.author`,
      args: [campus, since, since],
    }),
  },
  // Terapia: grupos, plazas ocupadas y personas distintas. Clasifica a quién
  // va a más grupos; desempata cuántos ha abierto.
  terapia: {
    totals: (campus, since) => ({
      sql: `SELECT (SELECT COUNT(*) FROM therapy_groups WHERE campus_id = ? AND (? IS NULL OR created_at >= ?)) AS groups,
                   COUNT(*) AS seats,
                   COUNT(DISTINCT m.login) AS people
            FROM therapy_members m JOIN therapy_groups g ON g.id = m.group_id
            WHERE g.campus_id = ? AND (? IS NULL OR m.joined_at >= ?)`,
      args: [campus, since, since, campus, since, since],
    }),
    ranking: (campus, since) => ({
      sql: `SELECT m.login AS login, COUNT(*) AS value,
                   (SELECT COUNT(*) FROM therapy_groups c
                     WHERE c.creator = m.login AND c.campus_id = ? AND (? IS NULL OR c.created_at >= ?)) AS extra
            FROM therapy_members m JOIN therapy_groups g ON g.id = m.group_id
            WHERE g.campus_id = ? AND (? IS NULL OR m.joined_at >= ?)
            GROUP BY m.login`,
      args: [campus, since, since, campus, since, since],
    }),
  },
  // Pizarras: las ya dadas (empezadas), quién se apuntó y cuántas personas
  // distintas. Clasifica a quien explica por la gente que ha ido a escucharle.
  pizarras: {
    totals: (campus, since, now) => ({
      sql: `SELECT COUNT(DISTINCT b.id) AS boards,
                   COUNT(a.login) AS seats,
                   COUNT(DISTINCT a.login) AS people
            FROM boards b LEFT JOIN board_attendees a ON a.board_id = b.id
            WHERE b.campus_id = ? AND b.starts_at <= ? AND (? IS NULL OR b.starts_at >= ?)`,
      args: [campus, now, since, since],
    }),
    ranking: (campus, since, now) => ({
      sql: `SELECT b.host AS login,
                   (SELECT COUNT(*) FROM board_attendees a
                     JOIN boards x ON x.id = a.board_id
                     WHERE x.host = b.host AND x.campus_id = ? AND x.starts_at <= ?
                       AND (? IS NULL OR x.starts_at >= ?)) AS value,
                   COUNT(*) AS extra
            FROM boards b
            WHERE b.campus_id = ? AND b.starts_at <= ? AND (? IS NULL OR b.starts_at >= ?)
            GROUP BY b.host`,
      args: [campus, now, since, since, campus, now, since, since],
    }),
  },
  // Not-games: partidas, aciertos y fallos. Clasifica por partidas ganadas;
  // desempata por aciertos.
  notgames: {
    totals: (campus, since) => ({
      sql: `SELECT COUNT(DISTINCT room_id) AS games,
                   COUNT(DISTINCT login) AS people,
                   COALESCE(SUM(correct), 0) AS correct,
                   COALESCE(SUM(wrong), 0) AS wrong
            FROM game_results WHERE campus_id = ? AND (? IS NULL OR at >= ?)`,
      args: [campus, since, since],
    }),
    ranking: (campus, since) => ({
      sql: `SELECT login, SUM(won) AS value, SUM(correct) AS extra
            FROM game_results WHERE campus_id = ? AND (? IS NULL OR at >= ?)
            GROUP BY login`,
      args: [campus, since, since],
    }),
  },
}

export const STATS_SECTIONS = Object.keys(QUERIES) as StatsSectionId[]

export function createStatsRepository(db: Db) {
  return {
    /** Las cifras de una sección, en el orden de sus columnas. */
    async totals(
      section: StatsSectionId,
      campus: number,
      since: string | null,
      now: string,
    ): Promise<{ key: string; value: number }[]> {
      const result = await db.execute(QUERIES[section].totals(campus, since, now))
      const row = result.rows[0]

      return result.columns.map((key) => ({ key, value: toNumber(row?.[key] ?? 0) }))
    },

    /** La clasificación entera de una sección, de mejor a peor, sin quien no ha hecho nada. */
    async ranking(
      section: StatsSectionId,
      campus: number,
      since: string | null,
      now: string,
    ): Promise<RankRow[]> {
      const inner = QUERIES[section].ranking(campus, since, now)
      const result = await db.execute({
        sql: `SELECT r.login, u.image, r.value, r.extra
              FROM (${inner.sql}) r
              LEFT JOIN users u ON u.login = r.login
              WHERE r.value > 0
              ORDER BY r.value DESC, r.extra DESC, r.login`,
        args: inner.args,
      })

      return result.rows.map((row) => ({
        login: toText(row.login),
        image: typeof row.image === 'string' ? row.image : null,
        value: toNumber(row.value),
        extra: toNumber(row.extra ?? 0),
      }))
    },
  }
}

export type StatsRepository = ReturnType<typeof createStatsRepository>
