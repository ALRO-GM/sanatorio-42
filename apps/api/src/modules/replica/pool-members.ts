/**
 * La copia de los piscineros de cada campus (`docs/piscineros.md`): quien
 * empezó la C Piscine en los últimos 60 días (o empieza en los próximos 30).
 * Unas pocas páginas cada seis horas, con cuota de sobra; también se apunta a
 * cada piscinero al entrar. De `pool_members` sale quién ve a quién.
 */

import type { Db } from '../../core/db/database.js'
import { toText } from '../../core/db/rows.js'
import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import { avatarUrlOf } from '../../integrations/forty-two/avatar.js'
import type { ApiUser } from '../../integrations/forty-two/types.js'
import type { QuotaGate } from './quota.js'

const DAY_MS = 86_400_000
/** La misma ventana que decide quién entra como piscinero (`modules/pool/pool.rules.ts`). */
const AFTER_MS = 60 * DAY_MS
const BEFORE_MS = 30 * DAY_MS
/** Cada cuánto se repasa un campus. */
const EVERY_MS = 6 * 60 * 60_000
/** Como mucho, estas páginas por vuelta: una piscina son unos cientos de personas. */
const MAX_PAGES = 10

type PoolMembersOptions = {
  db: Db
  client: FortyTwoClient
  campusIds: readonly number[]
  quota: QuotaGate
  hourlyReserve: number
  log?: (message: string) => void
  now?: () => number
}

const iso = (ms: number): string => new Date(ms).toISOString()

export function createPoolMembers(options: PoolMembersOptions) {
  const { db, client } = options
  const now = options.now ?? Date.now
  const log = options.log ?? (() => undefined)
  /** Cuándo se repasó cada campus. En memoria: perderlo solo cuesta repasarlo antes. */
  const doneAt = new Map<number, number>()
  let running = false

  const save = async (
    campusId: number,
    people: readonly { user: ApiUser; beginAt: string }[],
  ): Promise<void> => {
    if (people.length === 0) return

    const at = iso(now())

    await db.batch(
      people.map(({ user, beginAt }) => ({
        sql: `INSERT INTO pool_members (campus_id, user_id, login, image, begin_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT (campus_id, user_id) DO UPDATE SET
                login = excluded.login, image = excluded.image,
                begin_at = excluded.begin_at, updated_at = excluded.updated_at`,
        args: [campusId, user.id, user.login.toLowerCase(), avatarUrlOf(user.image), beginAt, at],
      })),
      'write',
    )
  }

  return {
    /** Apunta a un piscinero que acaba de entrar, sin esperar a la copia. */
    async enter(campusId: number, profile: ApiUser): Promise<void> {
      const beginAt =
        profile.cursus_users?.find((entry) => entry.cursus_id === 9)?.begin_at ?? iso(now())

      await save(campusId, [{ user: profile, beginAt }])
    },

    /** Los logins de los piscineros en curso de un campus. */
    async loginsIn(campusId: number): Promise<string[]> {
      const result = await db.execute({
        sql: 'SELECT login FROM pool_members WHERE campus_id = ? AND begin_at >= ?',
        args: [campusId, iso(now() - AFTER_MS)],
      })

      return result.rows.map((row) => toText(row.login))
    },

    /** Una vuelta: repasa el campus que más tiempo lleva sin repasar, si toca y hay cuota. */
    async step(): Promise<void> {
      if (running) return
      running = true

      try {
        const due = options.campusIds.find(
          (campusId) => now() - (doneAt.get(campusId) ?? 0) >= EVERY_MS,
        )

        if (due === undefined || !options.quota.allows('background', options.hourlyReserve)) {
          return
        }

        const from = iso(now() - AFTER_MS)
        const to = iso(now() + BEFORE_MS)

        for (let page = 1; page <= MAX_PAGES; page++) {
          const result = await client.getPiscinePage({
            campusId: due,
            beginFrom: from,
            beginTo: to,
            page,
          })

          await save(
            due,
            result.items.flatMap((item) =>
              item.user === undefined || item.user === null || typeof item.begin_at !== 'string'
                ? []
                : [{ user: item.user, beginAt: item.begin_at }],
            ),
          )
          if (result.items.length < result.perPage) break
        }

        // Quien empezó hace más de la ventana ya no es piscinero en curso.
        await db.execute({
          sql: 'DELETE FROM pool_members WHERE campus_id = ? AND begin_at < ?',
          args: [due, from],
        })
        doneAt.set(due, now())
      } catch (error) {
        log(`piscineros: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        running = false
      }
    },
  }
}

export type PoolMembers = ReturnType<typeof createPoolMembers>
