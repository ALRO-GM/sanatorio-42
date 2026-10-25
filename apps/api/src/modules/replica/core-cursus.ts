/**
 * La copia del 42cursus de cada campus (`docs/blackhole.md`): de cada persona,
 * su grado (`Cadet`, `Transcender`, `Alumni`…), cuándo salió (`end_at`), su
 * fecha de black hole y si su cuenta sigue activa. Es lo que dice si alguien
 * terminó el common core, sigue en él o se lo tragó el black hole.
 *
 * Coste: `GET /v2/cursus/21/cursus_users?filter[campus_id]=…`, de 100 en 100.
 * Madrid son 26 páginas (2 598 filas en octubre de 2026); los cuatro campus
 * copiados, unas 70 peticiones al día, de fondo y solo si sobra cuota. Ni una
 * por persona.
 */

import type { Db } from '../../core/db/database.js'
import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import type { ApiCursusMember } from '../../integrations/forty-two/types.js'
import type { QuotaGate } from './quota.js'

/** Cada cuánto se repasa un campus: el grado y el fin cambian despacio. */
const EVERY_MS = 24 * 60 * 60_000
/** Tope de páginas por campus y vuelta: Madrid son 26; con margen para crecer. */
const MAX_PAGES = 80

type CoreCursusOptions = {
  db: Db
  client: FortyTwoClient
  campusIds: readonly number[]
  quota: QuotaGate
  hourlyReserve: number
  log?: (message: string) => void
  now?: () => number
}

/** `true`/`false` de 42 a `1`/`0`; lo que no viene, `null`. */
const flag = (value: boolean | null | undefined): number | null =>
  value === true ? 1 : value === false ? 0 : null

export function createCoreCursus(options: CoreCursusOptions) {
  const { db, client } = options
  const now = options.now ?? Date.now
  const log = options.log ?? (() => undefined)
  /** Cuándo se repasó cada campus. En memoria: perderlo solo cuesta repasarlo antes. */
  const doneAt = new Map<number, number>()
  let running = false

  const save = async (campusId: number, items: readonly ApiCursusMember[]): Promise<void> => {
    const at = new Date(now()).toISOString()
    const rows = items.flatMap((item) => {
      const user = item.user

      return user === undefined || user === null || typeof user.login !== 'string'
        ? []
        : [{ item, user }]
    })

    if (rows.length === 0) return

    await db.batch(
      rows.map(({ item, user }) => ({
        sql: `INSERT INTO core_cursus
                (user_id, login, campus_id, begin_at, end_at, blackholed_at, grade, active, alumni, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT (user_id) DO UPDATE SET
                login = excluded.login, campus_id = excluded.campus_id,
                begin_at = excluded.begin_at, end_at = excluded.end_at,
                blackholed_at = excluded.blackholed_at, grade = excluded.grade,
                active = excluded.active, alumni = excluded.alumni,
                updated_at = excluded.updated_at`,
        args: [
          user.id,
          user.login.toLowerCase(),
          campusId,
          item.begin_at ?? null,
          item.end_at ?? null,
          item.blackholed_at ?? null,
          item.grade ?? null,
          flag(user['active?']),
          user['alumni?'] === true ? 1 : 0,
          at,
        ],
      })),
      'write',
    )
  }

  return {
    /** Una vuelta: repasa el campus que más tiempo lleva sin repasar, si toca y hay cuota. */
    async step(): Promise<void> {
      if (running) return
      running = true

      try {
        const due = options.campusIds.find(
          (campusId) => now() - (doneAt.get(campusId) ?? -Infinity) >= EVERY_MS,
        )

        if (due === undefined || !options.quota.allows('background', options.hourlyReserve)) {
          return
        }

        for (let page = 1; page <= MAX_PAGES; page++) {
          // Página a página: si la cuota se acaba a medias, sigue en la próxima vuelta.
          if (page > 1 && !options.quota.allows('background', options.hourlyReserve)) return

          const result = await client.getCoreCursusPage({ campusId: due, page })

          await save(due, result.items)
          if (result.items.length < result.perPage) break
        }
        doneAt.set(due, now())
      } catch (error) {
        log(`42cursus: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        running = false
      }
    },
  }
}
