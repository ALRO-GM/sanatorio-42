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

    /** Proyectos con correcciones y cuántas tiene cada uno. */
    async projects(campusId: number): Promise<{ id: number; corrections: number }[]> {
      const result = await db.execute({
        sql: `SELECT project_id, COUNT(*) AS total FROM corrections
              WHERE campus_id = ? AND project_id IS NOT NULL
              GROUP BY project_id ORDER BY total DESC`,
        args: [campusId],
      })

      return result.rows.map((row) => ({
        id: toNumber(row.project_id),
        corrections: toNumber(row.total),
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
