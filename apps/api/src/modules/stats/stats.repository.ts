/**
 * Las cuentas de las estadísticas de Ayuda, en SQL y solo de lectura, sobre
 * las tablas de cada sección. Todo es del campus que se mira y desde `since`
 * (`null`: desde siempre).
 */

import type { StatsSectionId } from '@sanatorio/contracts'

import type { Db } from '../../core/db/database.js'
import { toNumber, toText, toTextOrNull } from '../../core/db/rows.js'
import { inList, listArg } from '../../core/db/sql.js'

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

    /**
     * Los `limit` primeros de una sección, de mejor a peor, sin quien no ha
     * hecho nada; y aparte la fila de `login` con su puesto, salga o no en
     * esos primeros. Así la respuesta no crece con el campus: la clasificación
     * entera no se lee nunca.
     */
    async ranking(
      section: StatsSectionId,
      campus: number,
      since: string | null,
      now: string,
      limit: number,
      login: string,
    ): Promise<{ top: RankRow[]; me: (RankRow & { rank: number }) | null }> {
      const inner = QUERIES[section].ranking(campus, since, now)
      const rowOf = (row: Record<string, unknown>): RankRow => ({
        login: toText(row.login),
        image: toTextOrNull(row.image),
        value: toNumber(row.value),
        extra: toNumber(row.extra ?? 0),
      })
      const [top, mine] = await Promise.all([
        db.execute({
          sql: `SELECT r.login, u.image, r.value, r.extra
                FROM (${inner.sql}) r
                LEFT JOIN users u ON u.login = r.login
                WHERE r.value > 0
                ORDER BY r.value DESC, r.extra DESC, r.login
                LIMIT ?`,
          args: [...inner.args, limit],
        }),
        // El puesto propio: uno más que quienes van por delante (misma regla
        // de empate que `ranked`: igual valor y extra, mismo puesto).
        db.execute({
          sql: `SELECT r.login, u.image, r.value, r.extra,
                       (SELECT COUNT(*) FROM (${inner.sql}) o
                         WHERE o.value > 0
                           AND (o.value > r.value OR (o.value = r.value AND o.extra > r.extra))) + 1 AS rank
                FROM (${inner.sql}) r
                LEFT JOIN users u ON u.login = r.login
                WHERE r.login = ? AND r.value > 0`,
          args: [...inner.args, ...inner.args, login],
        }),
      ])
      const me = mine.rows[0]

      return {
        top: top.rows.map(rowOf),
        me: me === undefined ? null : { ...rowOf(me), rank: toNumber(me.rank) },
      }
    },
  }
}

export type StatsRepository = ReturnType<typeof createStatsRepository>

/** Lo que dice el 42cursus de alguien (`core_cursus`), fechas en ms. */
type CursusRow = {
  /** El campus de su 42cursus. */
  campusId: number
  beginAt: number | null
  endAt: number | null
  blackholedAt: number | null
  grade: string | null
  active: boolean | null
  alumni: boolean
}

/** Un proyecto del plan aprobado o empezado por alguien, para su avance. */
type ProgressRow = {
  login: string
  image: string | null
  projectId: number
  /** Aprobado, y cuándo (ms); `null` si no. */
  doneAt: number | null
  /** Cuándo se apuntó (ms), para saber cuándo empezó quien no tiene fecha de inicio. */
  createdAt: number | null
  /**
   * Cuándo se apuntó, solo si 42 lo dice (`null` si no): las filas de Libft que 42
   * reescribió en lote no lo traen, y así se distinguen de quien lo repitió.
   */
  openedAt: number | null
  beginAt: number | null
  track: 'classic' | 'next' | null
  /** Si es del campus de quien pregunta. */
  here: boolean
  /** Su 42cursus, si está copiado. */
  cursus: CursusRow | null
}

const msOf = (value: unknown): number | null => {
  const ms = typeof value === 'string' ? Date.parse(value) : NaN

  return Number.isNaN(ms) ? null : ms
}

const flagOf = (value: unknown): boolean | null =>
  value === null || value === undefined ? null : toNumber(value) === 1

export function createProgressRepository(db: Db) {
  return {
    /** Slug, nombre y horas de cada uno de esos proyectos. */
    async projects(
      ids: readonly number[],
    ): Promise<Map<number, { slug: string; name: string; hours: number | null }>> {
      if (ids.length === 0) return new Map()

      const result = await db.execute({
        sql: `SELECT id, slug, name, hours FROM projects WHERE ${inList('id')}`,
        args: [listArg(ids)],
      })

      return new Map(
        result.rows.map((row) => [
          toNumber(row.id),
          {
            slug: typeof row.slug === 'string' ? row.slug : '',
            name: typeof row.name === 'string' && row.name !== '' ? row.name : toText(row.slug),
            hours: typeof row.hours === 'number' && row.hours > 0 ? row.hours : null,
          },
        ]),
      )
    },

    /** El nombre de cada campus (id → nombre), para rotular medias y sugerencias. */
    async campusNames(): Promise<Map<number, string>> {
      const result = await db.execute('SELECT id, name FROM campuses')

      return new Map(result.rows.map((row) => [toNumber(row.id), toText(row.name)]))
    },

    /** El id de cada uno de esos slugs que esté en la réplica (las otras versiones de un proyecto). */
    async idsOf(slugs: readonly string[]): Promise<Map<string, number>> {
      if (slugs.length === 0) return new Map()

      const result = await db.execute({
        sql: `SELECT id, slug FROM projects WHERE ${inList('slug')}`,
        args: [listArg(slugs)],
      })

      return new Map(result.rows.map((row) => [toText(row.slug), toNumber(row.id)]))
    },

    /**
     * Lo último que hizo cada persona con 42cursus copiado: apuntarse a un
     * proyecto o mover uno abierto (`docs/blackhole.md`). Lo aprobado no
     * cuenta: 42 retoca esas filas en lote años después.
     */
    async activity(): Promise<Map<string, number>> {
      const result = await db.execute(
        `SELECT cc.login, MAX(pu.created_at_42) AS created,
                MAX(CASE WHEN pu.status != 'finished' THEN pu.updated_at_42 END) AS moved
         FROM core_cursus cc JOIN project_users pu ON pu.user_id = cc.user_id
         GROUP BY cc.login`,
      )

      return new Map(
        result.rows.flatMap((row) => {
          const last = Math.max(msOf(row.created) ?? -Infinity, msOf(row.moved) ?? -Infinity)

          return Number.isFinite(last) ? [[toText(row.login), last] as const] : []
        }),
      )
    },

    /** Los proyectos del plan de todo el mundo (de todos los campus), uno por fila. */
    async rows(campus: number, ids: readonly number[]): Promise<ProgressRow[]> {
      if (ids.length === 0) return []

      const result = await db.execute({
        sql: `SELECT u.login, u.image, pu.project_id, pu.status, pu.validated, pu.final_mark, pu.created_at_42,
                     pu.updated_at_42, ul.begin_at, ut.track,
                     (m.user_id IS NOT NULL OR cc.campus_id = ?) AS here,
                     cc.user_id AS cc_user, cc.campus_id AS cc_campus, cc.begin_at AS cc_begin, cc.end_at, cc.blackholed_at,
                     cc.grade, cc.active, cc.alumni
              FROM project_users pu
              JOIN users u ON u.id = pu.user_id
              LEFT JOIN user_levels ul ON ul.login = u.login
              LEFT JOIN user_tracks ut ON ut.login = u.login
              LEFT JOIN campus_members m ON m.user_id = u.id AND m.campus_id = ?
              LEFT JOIN core_cursus cc ON cc.user_id = u.id
              WHERE ${inList('pu.project_id')}`,
        args: [campus, campus, listArg(ids)],
      })

      return result.rows.map((row) => ({
        login: toText(row.login),
        image: toTextOrNull(row.image),
        projectId: toNumber(row.project_id),
        // Aprobado: validado, aunque lo esté repitiendo (para subir nota): 42 deja
        // en la fila la nota y el `validated?` del último intento cerrado. Así
        // salía sin hacer agent-smith de smarin-s (`searching_a_group`, 98).
        doneAt:
          toNumber(row.validated ?? 0) === 1 &&
          (row.status === 'finished' || (row.final_mark !== null && row.final_mark !== undefined))
            ? msOf(row.updated_at_42)
            : null,
        // Las filas antiguas no traen cuándo se apuntó: la última vez que cambió
        // es lo más temprano que se sabe.
        createdAt: msOf(row.created_at_42) ?? msOf(row.updated_at_42),
        openedAt: msOf(row.created_at_42),
        beginAt: msOf(row.begin_at),
        track: row.track === 'classic' || row.track === 'next' ? row.track : null,
        here: toNumber(row.here ?? 0) === 1,
        cursus:
          row.cc_user === null || row.cc_user === undefined
            ? null
            : {
                campusId: toNumber(row.cc_campus),
                beginAt: msOf(row.cc_begin),
                endAt: msOf(row.end_at),
                blackholedAt: msOf(row.blackholed_at),
                grade: toTextOrNull(row.grade),
                active: flagOf(row.active),
                alumni: toNumber(row.alumni ?? 0) === 1,
              },
      }))
    },
  }
}

export type ProgressRepository = ReturnType<typeof createProgressRepository>
