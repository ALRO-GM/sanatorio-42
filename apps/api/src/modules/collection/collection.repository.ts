/**
 * Lo que lee el álbum de correcciones, todo de la réplica y de la copia de
 * correcciones (`network`): ni una petición a 42. Solo lectura.
 */

import type { Db } from '../../core/db/database.js'
import { toNumber, toText, toTextOrNull } from '../../core/db/rows.js'
import { inList, listArg } from '../../core/db/sql.js'

/** El 42cursus y la C Piscine en la copia de correcciones (`corrections.cursus`). */
export const CORE_CURSUS = 21
export const POOL_CURSUS = 9

/** Alguien del campus con lo que aprobó del álbum. */
export type FinishedRow = {
  login: string
  image: string | null
  /** Cuándo empezó (ISO-8601), o `null` si no se sabe. */
  beginAt: string | null
  /**
   * Lo primero que se sabe de esa persona en 42: cuándo se apuntó a su primer
   * proyecto (de cualquier campus). Con `beginAt`, da su kickoff real.
   */
  firstAt: string | null
  finished: Set<number>
}

export function createCollectionRepository(db: Db) {
  return {
    /** Los ids de los proyectos con esos `slug` que ya hay en la réplica. */
    async projectIdsOf(slugs: readonly string[]): Promise<number[]> {
      if (slugs.length === 0) return []

      const result = await db.execute({
        sql: `SELECT id FROM projects WHERE ${inList('slug')}`,
        args: [listArg(slugs)],
      })

      return result.rows.map((row) => toNumber(row.id))
    },

    /** El `slug` de cada uno de esos proyectos que ya hay en la réplica. */
    async slugsOf(projectIds: readonly number[]): Promise<Map<number, string | null>> {
      if (projectIds.length === 0) return new Map()

      const result = await db.execute({
        sql: `SELECT id, slug FROM projects WHERE ${inList('id')}`,
        args: [listArg(projectIds)],
      })

      return new Map(result.rows.map((row) => [toNumber(row.id), toTextOrNull(row.slug)]))
    },

    /**
     * La gente de un campus que aprobó (terminado y validado) alguno de esos
     * proyectos: los estudiantes del campus o, con `pool`, los piscineros en
     * curso (los que empezaron desde `pool.since`, ISO). Quién se ve y quién no
     * lo decide después el servicio.
     */
    async finishedIn(
      campusId: number,
      pool: { since: string } | null,
      projectIds: readonly number[],
    ): Promise<Map<string, FinishedRow>> {
      const people = new Map<string, FinishedRow>()

      if (projectIds.length === 0) return people

      const result = await db.execute(
        pool !== null
          ? {
              sql: `SELECT pm.login AS login, pm.image AS image, pm.begin_at AS begin_at,
                           NULL AS first_at, pu.project_id
                    FROM pool_members pm
                    JOIN project_users pu ON pu.user_id = pm.user_id
                    WHERE pm.campus_id = ?
                      AND pm.begin_at >= ?
                      AND pu.status = 'finished' AND pu.validated = 1
                      AND ${inList('pu.project_id')}`,
              args: [campusId, pool.since, listArg(projectIds)],
            }
          : {
              sql: `SELECT u.login AS login, u.image AS image,
                           COALESCE(cc.begin_at, ul.begin_at) AS begin_at,
                           (SELECT MIN(COALESCE(p2.created_at_42, p2.updated_at_42))
                              FROM project_users p2 WHERE p2.user_id = u.id) AS first_at,
                           pu.project_id
                    FROM campus_members cm
                    JOIN users u ON u.id = cm.user_id
                    JOIN project_users pu ON pu.user_id = u.id
                    LEFT JOIN core_cursus cc ON cc.user_id = u.id
                    LEFT JOIN user_levels ul ON ul.login = u.login
                    WHERE cm.campus_id = ?
                      AND pu.status = 'finished' AND pu.validated = 1
                      AND ${inList('pu.project_id')}`,
              args: [campusId, listArg(projectIds)],
            },
      )

      for (const row of result.rows) {
        const login = toText(row.login).toLowerCase()
        const known = people.get(login) ?? {
          login,
          image: toTextOrNull(row.image),
          beginAt: toTextOrNull(row.begin_at),
          firstAt: toTextOrNull(row.first_at),
          finished: new Set<number>(),
        }

        known.finished.add(toNumber(row.project_id))
        people.set(login, known)
      }

      return people
    },

    /**
     * Qué proyectos ha corregido al menos una vez cada cual en ese campus y
     * cursus. Corregirse a sí mismo (una fila rara de 42) no cuenta.
     */
    async correctedIn(campusId: number, cursus: number): Promise<Map<string, Set<number>>> {
      const result = await db.execute({
        sql: `SELECT DISTINCT corrector, project_id FROM corrections
              WHERE campus_id = ? AND cursus = ? AND corrector <> corrected
                AND project_id IS NOT NULL`,
        args: [campusId, cursus],
      })
      const found = new Map<string, Set<number>>()

      for (const row of result.rows) {
        const login = toText(row.corrector).toLowerCase()
        const set = found.get(login) ?? new Set<number>()

        set.add(toNumber(row.project_id))
        found.set(login, set)
      }

      return found
    },

    /**
     * Lo que ha corregido una persona en cualquier campus: como el grafo del
     * tablón, que cuenta también lo corregido antes de cambiarse de campus.
     */
    async correctedBy(login: string, cursus: number): Promise<Set<number>> {
      const result = await db.execute({
        sql: `SELECT DISTINCT project_id FROM corrections
              WHERE corrector = ? AND cursus = ? AND corrected <> corrector
                AND project_id IS NOT NULL`,
        args: [login, cursus],
      })

      return new Set(result.rows.map((row) => toNumber(row.project_id)))
    },

    /** Proyectos corregidos en el campus desde esa fecha (ISO): los que siguen vivos. */
    async aliveSince(campusId: number, cursus: number, since: string): Promise<Set<number>> {
      const result = await db.execute({
        sql: `SELECT DISTINCT project_id FROM corrections
              WHERE campus_id = ? AND cursus = ? AND begin_at >= ? AND project_id IS NOT NULL`,
        args: [campusId, cursus, since],
      })

      return new Set(result.rows.map((row) => toNumber(row.project_id)))
    },

    /**
     * Con quién se ha corregido alguien en el campus, en los dos sentidos, de
     * más correcciones a menos: la misma cercanía que la red de correcciones
     * (`partnersOf` del módulo `network`).
     */
    async partnersOf(campusId: number, cursus: number, login: string): Promise<string[]> {
      const result = await db.execute({
        sql: `SELECT CASE WHEN corrector = ? THEN corrected ELSE corrector END AS other,
                     COUNT(*) AS together
              FROM corrections
              WHERE campus_id = ? AND cursus = ? AND (corrector = ? OR corrected = ?)
                AND corrector <> corrected
              GROUP BY other ORDER BY together DESC, other`,
        args: [login, campusId, cursus, login, login],
      })

      return result.rows.map((row) => toText(row.other).toLowerCase())
    },
  }
}
