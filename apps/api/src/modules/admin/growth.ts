/**
 * Crecimiento y uso por campus para el panel (#71 del buzón): cuánta gente usa
 * la web cada día en cada campus, cuánta entra por primera vez y cuánta había
 * antes del periodo (para sumar el total). Solo lee.
 *
 * El campus de cada persona es el que eligió en la web y, si no eligió, el
 * suyo de 42. `-1` es «sin campus» (aún no se sabe).
 */

import type { AdminGrowth } from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import { assertAdmin } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { day, parse } from '../../core/validation.js'

/** Más de un año por petición no se pinta bien ni hace falta. */
const MAX_DAYS = 400
const DAY_MS = 86_400_000

const querySchema = z.object({
  from: day,
  to: day,
  campus: z
    .string()
    .regex(/^\d+(,\d+)*$/, 'campus: números separados por comas')
    .optional(),
})

/** El campus de cada persona de `profiles`, como subconsulta (`login`, `campus`). */
const CAMPUS_OF = `SELECT p.login, COALESCE(p.campus_id, (
    SELECT m.campus_id FROM campus_members m JOIN users u ON u.id = m.user_id
    WHERE u.login = p.login ORDER BY m.campus_id LIMIT 1), -1) AS campus
  FROM profiles p`

export function createGrowthService(db: Db) {
  return {
    async growth(actor: Actor, input: unknown): Promise<AdminGrowth> {
      assertAdmin(actor)

      const { from, to, campus } = parse(querySchema, input)
      const span = (Date.parse(to) - Date.parse(from)) / DAY_MS

      if (span < 0) throw domainError('invalid_input', 'El periodo acaba antes de empezar')
      if (span > MAX_DAYS) throw domainError('invalid_input', `Como mucho ${MAX_DAYS} días`)

      const wanted = campus === undefined ? null : campus.split(',').map(Number)
      const keep = (id: number): boolean => wanted === null || wanted.includes(id)

      const [campuses, active, fresh, before] = await Promise.all([
        db.execute(`SELECT c.campus AS id, COALESCE(k.name, '') AS name, COUNT(*) AS people
                    FROM (${CAMPUS_OF}) c LEFT JOIN campuses k ON k.id = c.campus
                    GROUP BY c.campus ORDER BY people DESC`),
        db.execute({
          sql: `SELECT rs.day, c.campus, COUNT(DISTINCT rs.login) AS n
                FROM request_stats rs JOIN (${CAMPUS_OF}) c ON c.login = rs.login
                WHERE rs.day BETWEEN ? AND ? GROUP BY rs.day, c.campus`,
          args: [from, to],
        }),
        db.execute({
          sql: `SELECT substr(p.created_at, 1, 10) AS day, c.campus, COUNT(*) AS n
                FROM profiles p JOIN (${CAMPUS_OF}) c ON c.login = p.login
                WHERE substr(p.created_at, 1, 10) BETWEEN ? AND ? GROUP BY 1, 2`,
          args: [from, to],
        }),
        db.execute({
          sql: `SELECT c.campus, COUNT(*) AS n FROM profiles p JOIN (${CAMPUS_OF}) c ON c.login = p.login
                WHERE substr(p.created_at, 1, 10) < ? GROUP BY c.campus`,
          args: [from],
        }),
      ])

      const days = new Map<string, AdminGrowth['days'][number]>()
      const slot = (when: string, campusId: number) => {
        const key = `${when}|${campusId}`
        const found = days.get(key) ?? { day: when, campusId, active: 0, newUsers: 0 }

        days.set(key, found)

        return found
      }

      for (const row of active.rows) {
        if (keep(toNumber(row.campus)))
          slot(toText(row.day), toNumber(row.campus)).active = toNumber(row.n)
      }
      for (const row of fresh.rows) {
        if (keep(toNumber(row.campus)))
          slot(toText(row.day), toNumber(row.campus)).newUsers = toNumber(row.n)
      }

      const all = campuses.rows.map((row) => ({
        id: toNumber(row.id),
        name: toText(row.name),
        people: toNumber(row.people),
      }))

      return {
        from,
        to,
        campuses: all,
        selected: wanted ?? all.map((one) => one.id),
        days: [...days.values()].sort(
          (a, b) => a.day.localeCompare(b.day) || a.campusId - b.campusId,
        ),
        before: before.rows
          .map((row) => ({ campusId: toNumber(row.campus), people: toNumber(row.n) }))
          .filter((row) => keep(row.campusId)),
      }
    },
  }
}
