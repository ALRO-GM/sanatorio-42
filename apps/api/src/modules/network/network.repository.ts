/**
 * Correcciones copiadas de 42. Solo SQL.
 *
 * Cada fila es de un cursus (`docs/piscineros.md`): el 42cursus (`21`) o la
 * C Piscine (`9`). Las lecturas miran uno solo, el 42cursus si no se dice:
 * lo de la piscina no se mezcla con lo de los estudiantes.
 */

import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { listArg, notInList } from '../../core/db/sql.js'

/** Una corrección a una persona, lista para guardar. */
export type CorrectionRow = {
  id: number
  campusId: number
  /** `21` (42cursus) o `9` (C Piscine). */
  cursus: number
  corrector: string
  corrected: string
  projectId: number | null
  beginAt: string
  finalMark: number | null
  /** La marca que puso quien corrigió. Sola no decide: ver `passed`. */
  positive: boolean | null
}

/** Cuántas veces ha corregido una persona a otra. */
/** Una corrección leída de la base, ya con su veredicto. */
type StoredCorrection = CorrectionRow & {
  /** `true` si aprobó; `null` si aún no se ha calculado. */
  passed: boolean | null
}

export type PairRow = { corrector: string; corrected: string; count: number }

/** Un campus, o varios para mirarlos juntos. */
type Campuses = number | readonly number[]

/** Para `campus_id IN (SELECT value FROM json_each(?))`: vale igual con uno que con varios. */
const scope = (campuses: Campuses): string =>
  JSON.stringify(typeof campuses === 'number' ? [campuses] : campuses)
const IN_SCOPE = 'campus_id IN (SELECT value FROM json_each(?))'

/** Qué correcciones se miran. */
type CorrectionFilter = {
  campusId: Campuses
  /** Sin él, el 42cursus. */
  cursus?: number
  from?: string | null
  to?: string | null
  projectId?: number | null
  /** `true`: solo las que aprobaron; `false`: solo las que suspendieron. */
  passed?: boolean | null
}

/** Filas por sentencia al guardar: 9 columnas × 100 queda lejos del tope de SQLite. */
const BATCH = 100

/** El cursus que se mira si no se dice otro: el de los estudiantes. */
const STUDENTS = 21

export function createNetworkRepository(db: Db) {
  /** El `WHERE` de un filtro y sus argumentos. */
  const where = (filter: CorrectionFilter): { sql: string; args: (string | number)[] } => {
    const clauses = [IN_SCOPE, 'cursus = ?']
    const args: (string | number)[] = [scope(filter.campusId), filter.cursus ?? STUDENTS]

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

    if (filter.passed !== null && filter.passed !== undefined) {
      clauses.push('passed = ?')
      args.push(Number(filter.passed))
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
                  (id, campus_id, cursus, corrector, corrected, project_id, begin_at,
                   final_mark, positive)
                VALUES ${batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}
                ON CONFLICT (id, corrected) DO UPDATE SET
                  cursus = excluded.cursus,
                  corrector = excluded.corrector,
                  project_id = excluded.project_id,
                  begin_at = excluded.begin_at,
                  final_mark = excluded.final_mark,
                  positive = excluded.positive`,
          args: batch.flatMap((row) => [
            row.id,
            row.campusId,
            row.cursus,
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

    /** Sustituye las notas mínimas de los proyectos. */
    async savePassMarks(marks: ReadonlyMap<number, number>): Promise<void> {
      const rows = [...marks]

      await db.batch(
        [
          'DELETE FROM project_pass_marks',
          ...Array.from({ length: Math.ceil(rows.length / BATCH) }, (_, index) => {
            const batch = rows.slice(index * BATCH, (index + 1) * BATCH)

            return {
              sql: `INSERT INTO project_pass_marks (project_id, pass_mark)
                    VALUES ${batch.map(() => '(?, ?)').join(', ')}`,
              args: batch.flat(),
            }
          }),
        ],
        'write',
      )
    },

    /**
     * Calcula el veredicto de las correcciones cuyo id está entre `fromId` y
     * `toId` (todas, si no se pasan).
     *
     * Aprueba la que tiene buena marca **y** una nota que llega a la mínima de
     * su proyecto. Una marca mala suspende siempre, por alta que sea la nota.
     *
     * @param fallback Nota mínima de los proyectos de los que no se sabe nada.
     */
    async judge(fallback: number, fromId = 0, toId = Number.MAX_SAFE_INTEGER): Promise<void> {
      await db.execute({
        sql: `UPDATE corrections SET passed = CASE
                WHEN positive = 0 THEN 0
                WHEN final_mark >= COALESCE(
                  (SELECT pass_mark FROM project_pass_marks m
                   WHERE m.project_id = corrections.project_id), ?) THEN 1
                ELSE 0
              END
              WHERE id BETWEEN ? AND ?`,
        args: [fallback, fromId, toId],
      })
    },

    /**
     * Borra las correcciones de un tramo de ids que ya no están en 42 (citas
     * anuladas, cuentas borradas). Solo del cursus que se repasa: 42 manda
     * cada cursus por separado y los ids se intercalan.
     *
     * @param keep Ids que 42 sí ha devuelto en ese tramo.
     * @returns Cuántas filas se han borrado.
     */
    async prune(
      campusId: number,
      cursus: number,
      afterId: number,
      upToId: number,
      keep: readonly number[],
    ): Promise<number> {
      const result = await db.execute({
        sql: `DELETE FROM corrections
              WHERE campus_id = ? AND cursus = ? AND id > ? AND id <= ?
                AND ${notInList('id')}`,
        args: [campusId, cursus, afterId, upToId, listArg(keep)],
      })

      return result.rowsAffected
    },

    /** Cuántas hay copiadas y entre qué fechas. */
    async extent(
      campusId: number,
      cursus = STUDENTS,
    ): Promise<{
      rows: number
      first: string | null
      last: string | null
    }> {
      const result = await db.execute({
        sql: `SELECT COUNT(*) AS total, MIN(begin_at) AS first, MAX(begin_at) AS last
              FROM corrections WHERE campus_id = ? AND cursus = ?`,
        args: [campusId, cursus],
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

    /**
     * Correcciones con veredicto de cada persona y cuántas aprobaron, vistas
     * desde un lado: las que hizo como corrector (`corrector`) o las que
     * recibieron sus propios proyectos (`corrected`).
     */
    async verdicts(
      filter: CorrectionFilter,
      side: 'corrector' | 'corrected',
    ): Promise<Map<string, { judged: number; passed: number }>> {
      const { sql, args } = where(filter)
      // `side` solo puede ser uno de los dos nombres de columna: no viene de fuera.
      const result = await db.execute({
        sql: `SELECT ${side} AS login, COUNT(passed) AS judged,
                     COALESCE(SUM(passed), 0) AS passed
              FROM corrections WHERE ${sql} GROUP BY ${side}`,
        args,
      })

      return new Map(
        result.rows.map((row) => [
          toText(row.login),
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
    ): Promise<StoredCorrection[]> {
      const { sql, args } = where(filter)
      const result = await db.execute({
        sql: `SELECT id, campus_id, cursus, corrector, corrected, project_id, begin_at, final_mark, positive,
                     passed
              FROM corrections
              WHERE ${sql} AND ((corrector = ? AND corrected = ?) OR (corrector = ? AND corrected = ?))
              ORDER BY begin_at DESC LIMIT ?`,
        args: [...args, a, b, b, a, limit],
      })

      return result.rows.map((row) => ({
        id: toNumber(row.id),
        campusId: toNumber(row.campus_id),
        cursus: toNumber(row.cursus),
        corrector: toText(row.corrector),
        corrected: toText(row.corrected),
        projectId: row.project_id === null ? null : toNumber(row.project_id),
        beginAt: toText(row.begin_at),
        finalMark: row.final_mark === null ? null : toNumber(row.final_mark),
        positive: row.positive === null ? null : toNumber(row.positive) === 1,
        passed: row.passed === null ? null : toNumber(row.passed) === 1,
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

    /**
     * Cuántas correcciones ha hecho alguien de cada proyecto, en cualquier
     * campus y solo del 42cursus. Una corrección a un grupo cuenta una vez.
     */
    async correctedByProject(login: string): Promise<Map<number, number>> {
      const result = await db.execute({
        sql: `SELECT project_id, COUNT(DISTINCT id) AS times FROM corrections
              WHERE corrector = ? AND corrected <> corrector AND project_id IS NOT NULL
                AND cursus = ${STUDENTS}
              GROUP BY project_id`,
        args: [login],
      })

      return new Map(result.rows.map((row) => [toNumber(row.project_id), toNumber(row.times)]))
    },

    /** Proyectos que se han corregido en un campus desde esa fecha: los que siguen vivos. */
    async correctedSince(campusId: number, since: string): Promise<Set<number>> {
      const result = await db.execute({
        sql: `SELECT DISTINCT project_id FROM corrections
              WHERE campus_id = ? AND cursus = ${STUDENTS} AND begin_at >= ?
                AND project_id IS NOT NULL`,
        args: [campusId, since],
      })

      return new Set(result.rows.map((row) => toNumber(row.project_id)))
    },

    /** Los logins que más correcciones han hecho en un campus (42cursus), el que más primero. */
    async topCorrectors(campusId: number, limit: number): Promise<string[]> {
      const result = await db.execute({
        sql: `SELECT corrector FROM corrections
              WHERE campus_id = ? AND cursus = ${STUDENTS} AND corrector <> corrected
              GROUP BY corrector ORDER BY COUNT(*) DESC, corrector LIMIT ?`,
        args: [campusId, limit],
      })

      return result.rows.map((row) => toText(row.corrector))
    },

    /** Con quién se ha corregido alguien: veces que corrigió (`gave`) y que le corrigieron (`got`). */
    async partnersOf(
      campusId: number,
      login: string,
      cursus = STUDENTS,
    ): Promise<{ login: string; gave: number; got: number }[]> {
      const result = await db.execute({
        sql: `SELECT other, SUM(gave) AS gave, SUM(got) AS got FROM (
                SELECT corrected AS other, COUNT(*) AS gave, 0 AS got FROM corrections
                WHERE campus_id = ? AND cursus = ? AND corrector = ? GROUP BY corrected
                UNION ALL
                SELECT corrector AS other, 0 AS gave, COUNT(*) AS got FROM corrections
                WHERE campus_id = ? AND cursus = ? AND corrected = ? GROUP BY corrector
              ) WHERE other <> ? GROUP BY other ORDER BY gave + got DESC, other`,
        args: [campusId, cursus, login, campusId, cursus, login, login],
      })

      return result.rows.map((row) => ({
        login: toText(row.other),
        gave: toNumber(row.gave),
        got: toNumber(row.got),
      }))
    },

    /** Los campus de los que hay correcciones copiadas del 42cursus. */
    async campuses(): Promise<number[]> {
      const result = await db.execute(
        `SELECT DISTINCT campus_id FROM corrections WHERE cursus = ${STUDENTS} ORDER BY campus_id`,
      )

      return result.rows.map((row) => toNumber(row.campus_id))
    },

    /** Año de la primera corrección de cada persona, hecha o recibida. */
    async firstYears(campusId: Campuses, cursus = STUDENTS): Promise<Map<string, number>> {
      const result = await db.execute({
        sql: `SELECT login, MIN(first) AS first FROM (
                SELECT corrector AS login, MIN(begin_at) AS first
                FROM corrections WHERE ${IN_SCOPE} AND cursus = ? GROUP BY corrector
                UNION ALL
                SELECT corrected AS login, MIN(begin_at) AS first
                FROM corrections WHERE ${IN_SCOPE} AND cursus = ? GROUP BY corrected
              ) GROUP BY login`,
        args: [scope(campusId), cursus, scope(campusId), cursus],
      })

      return new Map(
        result.rows.map((row) => [toText(row.login), Number(toText(row.first).slice(0, 4))]),
      )
    },

    /** Proyectos con correcciones: cuántas tiene cada uno y qué parte aprobó. */
    async projects(
      campusId: Campuses,
      cursus = STUDENTS,
    ): Promise<{ id: number; corrections: number; passRate: number | null }[]> {
      const result = await db.execute({
        sql: `SELECT project_id, COUNT(*) AS total, AVG(passed) AS pass_rate FROM corrections
              WHERE ${IN_SCOPE} AND cursus = ? AND project_id IS NOT NULL
              GROUP BY project_id ORDER BY total DESC`,
        args: [scope(campusId), cursus],
      })

      return result.rows.map((row) => ({
        id: toNumber(row.project_id),
        corrections: toNumber(row.total),
        passRate: row.pass_rate === null ? null : Math.round(Number(row.pass_rate) * 1000) / 1000,
      }))
    },

    /** Logins que empiezan por `prefix`, los más activos primero. */
    async search(
      campusId: Campuses,
      prefix: string,
      limit: number,
      cursus = STUDENTS,
    ): Promise<{ login: string; corrections: number }[]> {
      // `LIKE` trata `%` y `_` como comodines: se escapan para buscar lo escrito.
      const pattern = `${prefix.replace(/[\\%_]/g, '\\$&')}%`
      const result = await db.execute({
        sql: `SELECT login, SUM(total) AS total FROM (
                SELECT corrector AS login, COUNT(*) AS total FROM corrections
                WHERE ${IN_SCOPE} AND cursus = ? AND corrector LIKE ? ESCAPE '\\'
                GROUP BY corrector
                UNION ALL
                SELECT corrected AS login, COUNT(*) AS total FROM corrections
                WHERE ${IN_SCOPE} AND cursus = ? AND corrected LIKE ? ESCAPE '\\'
                GROUP BY corrected
              ) GROUP BY login ORDER BY total DESC, login LIMIT ?`,
        args: [scope(campusId), cursus, pattern, scope(campusId), cursus, pattern, limit],
      })

      return result.rows.map((row) => ({
        login: toText(row.login),
        corrections: toNumber(row.total),
      }))
    },
  }
}

export type NetworkRepository = ReturnType<typeof createNetworkRepository>
