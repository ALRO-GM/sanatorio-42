/**
 * El historial de asientos de 42 (`docs/asientos.md`): de cada campus, quién se
 * sentó en qué puesto y de cuándo a cuándo, hacia atrás, para que la red de
 * asientos no empiece el día que se empezó a mirar (2026-10-25).
 *
 * `GET /v2/campus/:id/locations?range[begin_at]=…`, un mes cada vez, del más
 * reciente al más antiguo, página a página y con el sitio por donde va guardado
 * en `sync_state` (`seats-history:<campus>`): si la cuota se acaba o el servidor
 * se reinicia, sigue ahí. Madrid son unas 850 000 sesiones desde 2019, unas
 * 8 500 peticiones: es trabajo de volumen (`seats` en `BULK_ORDER`), de noche y
 * con lo que sobra. Los campus, por orden de `campusIds` (Madrid primero).
 *
 * **Solo alumnos** (pedido por Alberto, 2026-10-27): se guarda la sesión si
 * quien se sentó está en el 42cursus del campus (`core_cursus`) y la sesión
 * empezó cuando ya lo estaba. La piscina (quien no pasó y el mes de piscina de
 * quien sí) no entra. Lo que está abierto ahora lo apunta la copia de puestos.
 */

import type { Db } from '../../core/db/database.js'
import { toText } from '../../core/db/rows.js'
import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import type { ApiLocation } from '../../integrations/forty-two/types.js'
import type { QuotaGate } from './quota.js'

const DAY = 24 * 60 * 60_000
/** El tramo de cada vuelta hacia atrás. */
const WINDOW_MS = 30 * DAY
/** Lo que dura una vuelta, como mucho: cada página tarda unos segundos. */
const STEP_BUDGET_MS = 16_000
/** Margen sobre la reserva de día: lo demás de fondo también gasta. */
const MARGIN = 60

type HistoryState = {
  /** Fin del tramo que toca (ISO): se copia hacia atrás desde aquí. */
  until: string
  /** Página del tramo que toca. */
  page: number
  done: boolean
  /** Sesiones vistas y las guardadas (de alumnos). */
  seen: number
  kept: number
}

const seatHistoryKey = (campusId: number): string => `seats-history:${campusId}`

type SeatHistoryOptions = {
  db: Db
  client: Pick<FortyTwoClient, 'getLocationsHistoryPage'>
  campusIds: readonly number[]
  quota: QuotaGate
  hourlyReserve: number
  log?: (message: string) => void
  now?: () => number
}

export function createSeatHistory(options: SeatHistoryOptions) {
  const { db, client } = options
  const now = options.now ?? Date.now
  const log = options.log ?? (() => undefined)
  let running = false

  const load = async (campusId: number): Promise<HistoryState> => {
    const stored = (
      await db.execute({
        sql: 'SELECT value FROM sync_state WHERE key = ?',
        args: [seatHistoryKey(campusId)],
      })
    ).rows[0]?.value

    try {
      if (typeof stored === 'string') return JSON.parse(stored) as HistoryState
    } catch {
      // Estado ilegible: se empieza otra vez desde hoy; lo copiado no se pierde.
    }

    return { until: new Date(now()).toISOString(), page: 1, done: false, seen: 0, kept: 0 }
  }

  const store = async (campusId: number, state: HistoryState): Promise<void> => {
    await db.execute({
      sql: `INSERT INTO sync_state (key, value, updated_at) VALUES (?, ?, ?)
            ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: [seatHistoryKey(campusId), JSON.stringify(state), new Date(now()).toISOString()],
    })
  }

  /** Cuándo empezó cada alumno del campus el 42cursus, y el primero de todos. */
  const studentsOf = async (
    campusId: number,
  ): Promise<{ since: Map<string, number>; first: number | null }> => {
    const rows = (
      await db.execute({
        sql: 'SELECT login, begin_at FROM core_cursus WHERE campus_id = ? AND begin_at IS NOT NULL',
        args: [campusId],
      })
    ).rows
    const since = new Map<string, number>()
    let first: number | null = null

    for (const row of rows) {
      const at = Date.parse(toText(row.begin_at))

      if (Number.isNaN(at)) continue
      since.set(toText(row.login), at)
      first = first === null ? at : Math.min(first, at)
    }

    return { since, first }
  }

  /** Guarda las sesiones cerradas de alumnos ya en el 42cursus. Devuelve cuántas. */
  const save = async (
    campusId: number,
    items: readonly ApiLocation[],
    since: Map<string, number>,
  ): Promise<number> => {
    const rows = items.flatMap((item) => {
      const login = item.user?.login.toLowerCase()
      const begin = Date.parse(item.begin_at ?? '')
      const end = Date.parse(item.end_at ?? '')
      const student = login === undefined ? undefined : since.get(login)

      // Abierta (la apunta la copia de puestos), sin persona, o de antes de
      // empezar el 42cursus (la piscina): fuera.
      if (
        item.user === undefined ||
        item.user === null ||
        login === undefined ||
        student === undefined ||
        Number.isNaN(begin) ||
        Number.isNaN(end) ||
        begin < student
      ) {
        return []
      }

      return [{ item, user: item.user, login }]
    })

    if (rows.length === 0) return 0

    await db.batch(
      rows.map(({ item, user, login }) => ({
        // La que ya apuntó la copia de puestos se queda con lo suyo; solo se
        // alarga hasta su salida de verdad.
        sql: `INSERT INTO seat_sessions
                (location_id, campus_id, user_id, login, host, begin_at, seen_at, first_seen_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT (location_id) DO UPDATE SET
                seen_at = MAX(seat_sessions.seen_at, excluded.seen_at)`,
        args: [
          item.id,
          campusId,
          user.id,
          login,
          item.host,
          item.begin_at ?? '',
          item.end_at ?? '',
          item.begin_at ?? '',
        ],
      })),
      'write',
    )

    return rows.length
  }

  const may = (): boolean => options.quota.allowsBulk('seats', options.hourlyReserve + MARGIN)

  return {
    /** Una vuelta: unos tramos del primer campus que no haya terminado, si sobra cuota. */
    async step(): Promise<void> {
      if (running) return
      running = true

      try {
        for (const campusId of options.campusIds) {
          const state = await load(campusId)

          if (state.done) continue

          const { since, first } = await studentsOf(campusId)

          // Sin el 42cursus copiado no se sabe quién es alumno: se espera.
          if (first === null) continue

          const deadline = Date.now() + STEP_BUDGET_MS

          while (Date.now() < deadline && may()) {
            const to = Date.parse(state.until)

            if (to <= first) {
              state.done = true
              await store(campusId, state)
              log(
                `historial de asientos del campus ${campusId}: completo ` +
                  `(${state.kept} sesiones de alumnos de ${state.seen})`,
              )
              break
            }

            const from = new Date(Math.max(first, to - WINDOW_MS)).toISOString()
            const result = await client.getLocationsHistoryPage({
              campusId,
              from,
              to: state.until,
              page: state.page,
            })

            state.seen += result.items.length
            state.kept += await save(campusId, result.items, since)

            if (result.items.length < result.perPage) {
              state.until = from
              state.page = 1
            } else {
              state.page += 1
            }

            await store(campusId, state)
          }

          // Un campus cada vez: el siguiente, cuando este termine.
          return
        }
      } catch (error) {
        log(`historial de asientos: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        running = false
      }
    },

    /** Por dónde va cada campus, para `npm run sync:status`. */
    async status(campusId: number): Promise<HistoryState | null> {
      const stored = (
        await db.execute({
          sql: 'SELECT value FROM sync_state WHERE key = ?',
          args: [seatHistoryKey(campusId)],
        })
      ).rows[0]?.value

      return typeof stored === 'string' ? (JSON.parse(stored) as HistoryState) : null
    },
  }
}

export type SeatHistory = ReturnType<typeof createSeatHistory>
