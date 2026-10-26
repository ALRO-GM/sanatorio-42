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
/**
 * Tope de páginas por campus y vuelta, por si 42 no deja de dar páginas llenas.
 * Madrid son 26, pero París pasa de 80: con 80 se quedaba en 8 000 filas justas
 * (visto en producción el 2026-10-25) y faltaba gente. Una vuelta al día por
 * campus, de fondo y con cuota, así que un tope alto cuesta poco.
 */
const MAX_PAGES = 250

/** Lo que se guarda de cada campus en `sync_state` (`cursus:<campus>`). */
export type CursusState = {
  /** Página que toca pedir; `1` si no hay ninguna vuelta a medias. */
  page: number
  /** Filas copiadas en la vuelta en curso (o en la última). */
  rows: number
  /** Las que dice 42 que hay. */
  total: number | null
  /** Cuándo terminó la última vuelta (ms). */
  doneAt: number | null
}

const FRESH: CursusState = { page: 1, rows: 0, total: null, doneAt: null }

export const cursusStateKey = (campusId: number): string => `cursus:${campusId}`

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

  const load = async (campusId: number): Promise<CursusState> => {
    const stored = (
      await db.execute({
        sql: 'SELECT value FROM sync_state WHERE key = ?',
        args: [cursusStateKey(campusId)],
      })
    ).rows[0]?.value

    try {
      if (typeof stored === 'string') return { ...FRESH, ...(JSON.parse(stored) as CursusState) }
    } catch {
      // Estado ilegible: se empieza de nuevo, que solo cuesta repasar el campus.
    }

    return { ...FRESH }
  }

  const store = async (campusId: number, state: CursusState): Promise<void> => {
    await db.execute({
      sql: `INSERT INTO sync_state (key, value, updated_at) VALUES (?, ?, ?)
            ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: [cursusStateKey(campusId), JSON.stringify(state), new Date(now()).toISOString()],
    })
  }

  const may = (): boolean => options.quota.allowsBulk('cursus', options.hourlyReserve)

  return {
    /**
     * Una vuelta: sigue el campus que se quedó a medias o, si no hay ninguno,
     * repasa el que toque, si hay cuota.
     */
    async step(): Promise<void> {
      if (running) return
      running = true

      try {
        const states = await Promise.all(
          options.campusIds.map(async (campusId) => ({ campusId, state: await load(campusId) })),
        )
        const due =
          states.find(({ state }) => state.page > 1) ??
          states.find(({ state }) => now() - (state.doneAt ?? -Infinity) >= EVERY_MS)

        if (due === undefined || !may()) {
          return
        }

        const { campusId, state } = due

        if (state.page === 1) state.rows = 0

        for (let fetched = 0; state.page <= MAX_PAGES; fetched++, state.page++) {
          // Página a página, y por dónde va se guarda: si la cuota se acaba a
          // medias o el servidor se reinicia, sigue en esa página, no en la 1.
          // Antes empezaba de cero cada vez, y París (más de 80 páginas) no
          // terminaba nunca cuando la cuota iba justa.
          if (fetched > 0 && !may()) return

          const result = await client.getCoreCursusPage({ campusId, page: state.page })

          await save(campusId, result.items)
          state.rows += result.items.length
          state.total = result.total

          if (result.items.length < result.perPage) break
          await store(campusId, { ...state, page: state.page + 1 })
        }
        await store(campusId, { ...state, page: 1, doneAt: now() })
      } catch (error) {
        log(`42cursus: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        running = false
      }
    },
  }
}
