/**
 * Curso de git fuera del clúster (2026-11-08). Quien administra da permiso a
 * algunas personas para jugar sin estar sentadas en un puesto, y que cuente.
 * A cambio, quien juega así dice dónde está (en 42, teletrabajo, fuera de 42);
 * lo dicho vale unas horas y queda apuntado en cada punto que supera.
 */

import type { CoursePlace, CourseRemoteAccess } from '@sanatorio/contracts'
import { z } from 'zod'

import { assertAdmin } from '../../core/actor.js'
import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toText, toTextOrNull } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { isoAt } from '../../core/time.js'
import { parse } from '../../core/validation.js'

/** Cuánto vale el sitio dicho: una tarde larga. Después se vuelve a preguntar. */
const PLACE_HOURS = 8

const PLACES = ['campus', 'remote', 'outside'] as const satisfies readonly CoursePlace[]

const placeSchema = z.object({ place: z.enum(PLACES) })
const accessSchema = z.object({
  login: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{1,30}$/, 'login no válido'),
  allowed: z.boolean(),
})

const isPlace = (value: string): value is CoursePlace =>
  (PLACES as readonly string[]).includes(value)

export function createRemoteAccess(db: Db, now: () => number) {
  async function allowed(login: string): Promise<boolean> {
    const result = await db.execute({
      sql: 'SELECT 1 FROM course_remote WHERE login = ?',
      args: [login],
    })

    return result.rows.length > 0
  }

  /** El sitio dicho hace menos de `PLACE_HOURS`, o `null`. */
  async function place(login: string): Promise<CoursePlace | null> {
    const result = await db.execute({
      sql: 'SELECT place FROM course_places WHERE login = ? AND declared_at >= ?',
      args: [login, isoAt(now() - PLACE_HOURS * 3_600_000)],
    })
    const value = result.rows[0] === undefined ? null : toText(result.rows[0].place)

    return value !== null && isPlace(value) ? value : null
  }

  return {
    async status(login: string): Promise<{ allowed: boolean; place: CoursePlace | null }> {
      if (!(await allowed(login))) return { allowed: false, place: null }

      return { allowed: true, place: await place(login) }
    },

    /** Desde dónde juega sin puesto, o `null` si no puede (sin permiso o sin decirlo). */
    async placeToPlay(login: string): Promise<CoursePlace | null> {
      return (await allowed(login)) ? place(login) : null
    },

    async declare(actor: Actor, input: unknown): Promise<void> {
      const { place: chosen } = parse(placeSchema, input)

      if (!(await allowed(actor.login))) {
        throw domainError('forbidden', 'No tienes permiso para hacer el curso fuera del clúster')
      }

      await db.execute({
        sql: `INSERT INTO course_places (login, place, declared_at) VALUES (?, ?, ?)
              ON CONFLICT (login) DO UPDATE SET place = excluded.place, declared_at = excluded.declared_at`,
        args: [actor.login, chosen, isoAt(now())],
      })
    },

    async list(actor: Actor): Promise<CourseRemoteAccess> {
      assertAdmin(actor)

      const result = await db.execute(
        `SELECT r.login, r.granted_by, r.granted_at, p.place, p.declared_at
         FROM course_remote r LEFT JOIN course_places p ON p.login = r.login
         ORDER BY r.login`,
      )

      return {
        people: result.rows.map((row) => {
          const value = toTextOrNull(row.place)

          return {
            login: toText(row.login),
            grantedBy: toText(row.granted_by),
            grantedAt: toText(row.granted_at),
            place: value !== null && isPlace(value) ? value : null,
            placeAt: toTextOrNull(row.declared_at),
          }
        }),
      }
    },

    async set(actor: Actor, input: unknown): Promise<void> {
      assertAdmin(actor)

      const change = parse(accessSchema, input)

      await (change.allowed
        ? db.execute({
            sql: `INSERT INTO course_remote (login, granted_by, granted_at) VALUES (?, ?, ?)
                  ON CONFLICT (login) DO NOTHING`,
            args: [change.login, actor.login, isoAt(now())],
          })
        : db.execute({ sql: 'DELETE FROM course_remote WHERE login = ?', args: [change.login] }))
    },
  }
}

export type RemoteAccess = ReturnType<typeof createRemoteAccess>
