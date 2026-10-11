/**
 * Correcciones copiadas de 42. Solo SQL.
 */

import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'

/** Una corrección a una persona, lista para guardar. */
export type CorrectionRow = {
  id: number
  campusId: number
  corrector: string
  corrected: string
  projectId: number | null
  beginAt: string
  finalMark: number | null
  positive: boolean | null
}

/** Cuántas veces ha corregido una persona a otra. */
export type PairRow = { corrector: string; corrected: string; count: number }

/** Qué correcciones se miran. */
export type CorrectionFilter = {
  campusId: number
  from?: string | null
  to?: string | null
  projectId?: number | null
  /** `true`: solo las que aprobaron; `false`: solo las que suspendieron. */
  positive?: boolean | null
}

/** Filas por sentencia al guardar: 8 columnas × 100 queda lejos del tope de SQLite. */
const BATCH = 100

export function createNetworkRepository(db: Db) {
  /** El `WHERE` de un filtro y sus argumentos. */
  const where = (filter: CorrectionFilter): { sql: string; args: (string | number)[] } => {
    const clauses = ['campus_id = ?']
    const args: (string | number)[] = [filter.campusId]

    if (filter.from !== null && filter.from !== undefined) {
      clauses.push('begin_at >= ?')
      args.push(filter.from)
    }
    if (filter.to !== null && filter.to !== undefined) {
      clauses.push('begin_at <= ?')
      args.push(filter.to)
    }
    if (filter.projectId !== null && filter.projectId !== undefined) {
      clauses.push('project_id = ?')
      args.push(filter.projectId)
    }

    if (filter.positive !== null && filter.positive !== undefined) {
      clauses.push('positive = ?')
      args.push(Number(filter.positive))
    }

    return { sql: clauses.join(' AND '), args }
  }

  return {
    /**
     * Guarda correcciones. Volver a recibir una la actualiza (la nota llega
     * después de la cita), sin duplicarla.
     */
    async save(rows: readonly CorrectionRow[]): Promise<void> {
      for (let start = 0; start < rows.length; start += BATCH) {
        const batch = rows.slice(start, start + BATCH)

        await db.execute({
          sql: `INSERT INTO corrections
                  (id, campus_id, corrector, corrected, project_id, begin_at, final_mark, positive)
                VALUES ${batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}
                ON CONFLICT (id, corrected) DO UPDATE SET
                  corrector = excluded.corrector,
                  project_id = excluded.project_id,
                  begin_at = excluded.begin_at,
                  final_mark = excluded.final_mark,
                  positive = excluded.positive`,
          args: batch.flatMap((row) => [
            row.id,
            row.campusId,
            row.corrector,
            row.corrected,
            row.projectId,
            row.beginAt,
            row.finalMark,
            row.positive === null ? null : Number(row.positive),
          ]),
        })
      }
    },

    /** Cuántas hay copiadas y entre qué fechas. */
    async extent(campusId: number): Promise<{
      rows: number
      first: string | null
      last: string | null
    }> {
      const result = await db.execute({
        sql: `SELECT COUNT(*) AS total, MIN(begin_at) AS first, MAX(begin_at) AS last
              FROM corrections WHERE campus_id = ?`,
        args: [campusId],
      })
      const row = result.rows[0]

      return {
        rows: toNumber(row?.total),
        first: typeof row?.first === 'string' ? row.first : null,
        last: typeof row?.last === 'string' ? row.last : null,
      }
    },

    /**
     * Las correcciones juntadas por pareja y sentido. Es la única lectura que
     * hace falta para montar el grafo: SQLite agrupa y aquí llegan ya contadas.
     */
    async pairs(filter: CorrectionFilter): Promise<PairRow[]> {
      const { sql, args } = where(filter)
      const result = await db.execute({
        sql: `SELECT corrector, corrected, COUNT(*) AS total
              FROM corrections WHERE ${sql} AND corrector <> corrected
              GROUP BY corrector, corrected`,
        args,
      })

      return result.rows.map((row) => ({
        corrector: toText(row.corrector),
        corrected: toText(row.corrected),
        count: toNumber(row.total),
      }))
    },

    /** Cuántas correcciones con veredicto ha hecho cada persona y cuántas aprobó. */
    async verdicts(
      filter: CorrectionFilter,
    ): Promise<Map<string, { judged: number; passed: number }>> {
      const { sql, args } = where(filter)
      const result = await db.execute({
        sql: `SELECT corrector, COUNT(positive) AS judged, COALESCE(SUM(positive), 0) AS passed
              FROM corrections WHERE ${sql} GROUP BY corrector`,
        args,
      })

      return new Map(
        result.rows.map((row) => [
          toText(row.corrector),
          { judged: toNumber(row.judged), passed: toNumber(row.passed) },
        ]),
      )
    },

    /** Correcciones por mes (`YYYY-MM`), en orden. */
    async timeline(filter: CorrectionFilter): Promise<{ month: string; corrections: number }[]> {
      const { sql, args } = where(filter)
      const result = await db.execute({
        sql: `SELECT substr(begin_at, 1, 7) AS month, COUNT(*) AS total
              FROM corrections WHERE ${sql} GROUP BY month ORDER BY month`,
        args,
      })

      return result.rows.map((row) => ({
        month: toText(row.month),
        corrections: toNumber(row.total),
      }))
    },

    /** Las correcciones entre dos personas, en los dos sentidos, las últimas primero. */
    async between(
      filter: CorrectionFilter,
      a: string,
      b: string,
      limit: number,
    ): Promise<CorrectionRow[]> {
      const { sql, args } = where(filter)
      const result = await db.execute({
        sql: `SELECT id, campus_id, corrector, corrected, project_id, begin_at, final_mark, positive
              FROM corrections
              WHERE ${sql} AND ((corrector = ? AND corrected = ?) OR (corrector = ? AND corrected = ?))
              ORDER BY begin_at DESC LIMIT ?`,
        args: [...args, a, b, b, a, limit],
      })

      return result.rows.map((row) => ({
        id: toNumber(row.id),
        campusId: toNumber(row.campus_id),
        corrector: toText(row.corrector),
        corrected: toText(row.corrected),
        projectId: row.project_id === null ? null : toNumber(row.project_id),
        beginAt: toText(row.begin_at),
        finalMark: row.final_mark === null ? null : toNumber(row.final_mark),
        positive: row.positive === null ? null : toNumber(row.positive) === 1,
      }))
    },

    /** Cuántas veces ha corregido `a` a `b` (`forth`) y `b` a `a` (`back`). */
    async countBetween(
      filter: CorrectionFilter,
      a: string,
      b: string,
    ): Promise<{ forth: number; back: number }> {
      const { sql, args } = where(filter)
      const result = await db.execute({
        sql: `SELECT corrector, COUNT(*) AS total FROM corrections
              WHERE ${sql} AND ((corrector = ? AND corrected = ?) OR (corrector = ? AND corrected = ?))
              GROUP BY corrector`,
        args: [...args, a, b, b, a],
      })
      const count = (login: string): number =>
        toNumber(result.rows.find((row) => toText(row.corrector) === login)?.total ?? 0)

      return { forth: count(a), back: count(b) }
    },

    /** Con quién se ha corregido alguien: veces que corrigió (`gave`) y que le corrigieron (`got`). */
    async partnersOf(
      campusId: number,
      login: string,
    ): Promise<{ login: string; gave: number; got: number }[]> {
      const result = await db.execute({
        sql: `SELECT other, SUM(gave) AS gave, SUM(got) AS got FROM (
                SELECT corrected AS other, COUNT(*) AS gave, 0 AS got FROM corrections
                WHERE campus_id = ? AND corrector = ? GROUP BY corrected
                UNION ALL
                SELECT corrector AS other, 0 AS gave, COUNT(*) AS got FROM corrections
                WHERE campus_id = ? AND corrected = ? GROUP BY corrector
              ) WHERE other <> ? GROUP BY other ORDER BY gave + got DESC, other`,
        args: [campusId, login, campusId, login, login],
      })

      return result.rows.map((row) => ({
        login: toText(row.other),
        gave: toNumber(row.gave),
        got: toNumber(row.got),
      }))
    },

    /** Año de la primera corrección de cada persona, hecha o recibida. */
    async firstYears(campusId: number): Promise<Map<string, number>> {
      const result = await db.execute({
        sql: `SELECT login, MIN(first) AS first FROM (
                SELECT corrector AS login, MIN(begin_at) AS first
                FROM corrections WHERE campus_id = ? GROUP BY corrector
                UNION ALL
                SELECT corrected AS login, MIN(begin_at) AS first
                FROM corrections WHERE campus_id = ? GROUP BY corrected
              ) GROUP BY login`,
        args: [campusId, campusId],
      })

      return new Map(
        result.rows.map((row) => [toText(row.login), Number(toText(row.first).slice(0, 4))]),
      )
    },

    /** Proyectos con correcciones: cuántas tiene cada uno y qué parte aprobó. */
    async projects(
      campusId: number,
    ): Promise<{ id: number; corrections: number; passRate: number | null }[]> {
      const result = await db.execute({
        sql: `SELECT project_id, COUNT(*) AS total, AVG(positive) AS pass_rate FROM corrections
              WHERE campus_id = ? AND project_id IS NOT NULL
              GROUP BY project_id ORDER BY total DESC`,
        args: [campusId],
      })

      return result.rows.map((row) => ({
        id: toNumber(row.project_id),
        corrections: toNumber(row.total),
        passRate: row.pass_rate === null ? null : Math.round(Number(row.pass_rate) * 1000) / 1000,
      }))
    },

    /** Logins que empiezan por `prefix`, los más activos primero. */
    async search(
      campusId: number,
      prefix: string,
      limit: number,
    ): Promise<{ login: string; corrections: number }[]> {
      // `LIKE` trata `%` y `_` como comodines: se escapan para buscar lo escrito.
      const pattern = `${prefix.replace(/[\\%_]/g, '\\$&')}%`
      const result = await db.execute({
        sql: `SELECT login, SUM(total) AS total FROM (
                SELECT corrector AS login, COUNT(*) AS total FROM corrections
                WHERE campus_id = ? AND corrector LIKE ? ESCAPE '\\' GROUP BY corrector
                UNION ALL
                SELECT corrected AS login, COUNT(*) AS total FROM corrections
                WHERE campus_id = ? AND corrected LIKE ? ESCAPE '\\' GROUP BY corrected
              ) GROUP BY login ORDER BY total DESC, login LIMIT ?`,
        args: [campusId, pattern, campusId, pattern, limit],
      })

      return result.rows.map((row) => ({
        login: toText(row.login),
        corrections: toNumber(row.total),
      }))
    },
  }
}

export type NetworkRepository = ReturnType<typeof createNetworkRepository>
