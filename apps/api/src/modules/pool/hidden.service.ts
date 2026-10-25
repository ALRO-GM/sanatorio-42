/**
 * Personas ocultas (`docs/personas-ocultas.md`): quien administra oculta a
 * alguien a los estudiantes, a los piscineros o a los dos. Para ese grupo no
 * existe: lo aplica `core/audience.ts` (`seesFor`, `visibleTo`) y, en las
 * consultas, `audienceWhere` de la réplica.
 */

import type { HiddenCandidate, HiddenPerson, PersonGroup } from '@sanatorio/contracts'
import { z } from 'zod'

import { assertAdmin } from '../../core/actor.js'
import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { parse } from '../../core/validation.js'

type HiddenServiceOptions = {
  db: Db
  /** Se llama tras cada cambio: `audience.forget`, para que se note al momento. */
  changed?: () => void
  now?: () => number
}

/** Como mucho, tantas personas en la lista: es para casos sueltos, no para vaciar la web. */
const MAX_HIDDEN = 500
/** Lo que devuelve el buscador del panel. */
const SEARCH_LIMIT = 12

const loginSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{1,30}$/, 'login no válido')
const inputSchema = z
  .object({
    fromStudents: z.boolean(),
    fromPool: z.boolean(),
    reason: z.string().max(500).optional(),
  })
  .strict()
  .refine((input) => input.fromStudents || input.fromPool, {
    message: 'Elige al menos un grupo',
  })
const searchSchema = z.object({ q: z.string().trim().toLowerCase().min(2).max(40) })

/** Los logins ocultos a los piscineros (`true`) o a los estudiantes: lo lee `core/audience.ts`. */
export async function hiddenLogins(db: Db, pool: boolean): Promise<string[]> {
  const result = await db.execute(
    `SELECT login FROM hidden_people WHERE ${pool ? 'from_pool' : 'from_students'} = 1`,
  )

  return result.rows.map((row) => toText(row.login))
}

export function createHiddenService(options: HiddenServiceOptions) {
  const { db } = options
  const now = options.now ?? Date.now
  const changed = options.changed ?? (() => undefined)

  /** El grupo de cada login: piscinero si está en una piscina, estudiante si está en la réplica. */
  async function groupsOf(logins: readonly string[]): Promise<Map<string, PersonGroup>> {
    const groups = new Map<string, PersonGroup>()

    if (logins.length === 0) return groups

    const list = logins.map(() => '?').join(', ')
    const [students, pool] = await Promise.all([
      db.execute({ sql: `SELECT login FROM users WHERE login IN (${list})`, args: [...logins] }),
      db.execute({
        sql: `SELECT DISTINCT login FROM pool_members WHERE login IN (${list})`,
        args: [...logins],
      }),
    ])

    for (const row of students.rows) groups.set(toText(row.login).toLowerCase(), 'student')
    for (const row of pool.rows) groups.set(toText(row.login).toLowerCase(), 'pool')

    return groups
  }

  async function list(): Promise<HiddenPerson[]> {
    const result = await db.execute(
      `SELECT h.login, h.from_students, h.from_pool, h.reason, h.hidden_by, h.hidden_at,
              COALESCE(u.image, (SELECT image FROM pool_members p WHERE p.login = h.login
                                 ORDER BY begin_at DESC LIMIT 1)) AS image
       FROM hidden_people h LEFT JOIN users u ON u.login = h.login
       ORDER BY h.hidden_at DESC, h.login`,
    )
    const groups = await groupsOf(result.rows.map((row) => toText(row.login)))

    return result.rows.map((row) => {
      const login = toText(row.login)

      return {
        login,
        image: typeof row.image === 'string' ? row.image : null,
        group: groups.get(login) ?? null,
        fromStudents: toNumber(row.from_students) === 1,
        fromPool: toNumber(row.from_pool) === 1,
        reason: typeof row.reason === 'string' && row.reason !== '' ? row.reason : null,
        by: toText(row.hidden_by),
        at: toText(row.hidden_at),
      }
    })
  }

  return {
    /** La lista, la más reciente primero. */
    async list(actor: Actor): Promise<HiddenPerson[]> {
      assertAdmin(actor)

      return list()
    },

    /**
     * Gente de cualquier grupo y campus cuyo login (o nombre) lleva lo escrito:
     * el buscador de arriba solo ve a los del mundo de quien mira, y aquí hay
     * que poder elegir también a un piscinero.
     */
    async search(actor: Actor, query: unknown): Promise<HiddenCandidate[]> {
      assertAdmin(actor)

      const { q } = parse(searchSchema, query)
      // Lo escrito va como texto: `%` y `_` no son comodines.
      const escaped = q.replace(/[\\%_]/g, (char) => `\\${char}`)
      const like = `%${escaped}%`
      const [students, pool] = await Promise.all([
        db.execute({
          sql: `SELECT login, name, image FROM users
                WHERE lower(login) LIKE ? ESCAPE '\\' OR lower(COALESCE(name, '')) LIKE ? ESCAPE '\\'
                ORDER BY (lower(login) LIKE ? ESCAPE '\\') DESC, login LIMIT ?`,
          args: [like, like, `${escaped}%`, SEARCH_LIMIT],
        }),
        db.execute({
          sql: `SELECT login, MAX(image) AS image FROM pool_members
                WHERE login LIKE ? ESCAPE '\\' GROUP BY login ORDER BY login LIMIT ?`,
          args: [like, SEARCH_LIMIT],
        }),
      ])
      const found = new Map<string, HiddenCandidate>()

      for (const row of students.rows) {
        const login = toText(row.login).toLowerCase()

        found.set(login, {
          login,
          name: typeof row.name === 'string' && row.name !== '' ? row.name : null,
          image: typeof row.image === 'string' ? row.image : null,
          group: 'student',
        })
      }
      // Quien está en una piscina en curso es piscinero, aunque también esté en la réplica.
      for (const row of pool.rows) {
        const login = toText(row.login).toLowerCase()

        found.set(login, {
          login,
          name: found.get(login)?.name ?? null,
          image: typeof row.image === 'string' ? row.image : (found.get(login)?.image ?? null),
          group: 'pool',
        })
      }

      return [...found.values()]
        .sort(
          (a, b) =>
            Number(b.login.startsWith(q)) - Number(a.login.startsWith(q)) ||
            a.login.localeCompare(b.login),
        )
        .slice(0, SEARCH_LIMIT)
    },

    /**
     * Oculta a alguien (o cambia de qué grupos, o el motivo). Devuelve la lista.
     *
     * @throws {DomainError} `invalid_input` sin ningún grupo; `conflict` con la lista llena.
     */
    async hide(actor: Actor, login: unknown, input: unknown): Promise<HiddenPerson[]> {
      assertAdmin(actor)

      const who = parse(loginSchema, login)
      const body = parse(inputSchema, input)
      const count = await db.execute({
        sql: 'SELECT COUNT(*) AS total FROM hidden_people WHERE login <> ?',
        args: [who],
      })

      if (toNumber(count.rows[0]?.total) >= MAX_HIDDEN) {
        throw domainError('conflict', `Como mucho ${MAX_HIDDEN} personas ocultas`)
      }

      const reason = body.reason?.trim() ?? ''

      await db.execute({
        sql: `INSERT INTO hidden_people (login, from_students, from_pool, reason, hidden_by, hidden_at)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT (login) DO UPDATE SET
                from_students = excluded.from_students, from_pool = excluded.from_pool,
                reason = excluded.reason, hidden_by = excluded.hidden_by,
                hidden_at = excluded.hidden_at`,
        args: [
          who,
          body.fromStudents ? 1 : 0,
          body.fromPool ? 1 : 0,
          reason === '' ? null : reason,
          actor.login,
          new Date(now()).toISOString(),
        ],
      })
      changed()

      return list()
    },

    /** Vuelve a enseñar a alguien a todo el mundo. Devuelve la lista. */
    async reveal(actor: Actor, login: unknown): Promise<HiddenPerson[]> {
      assertAdmin(actor)

      await db.execute({
        sql: 'DELETE FROM hidden_people WHERE login = ?',
        args: [parse(loginSchema, login)],
      })
      changed()

      return list()
    },
  }
}

export type HiddenService = ReturnType<typeof createHiddenService>
