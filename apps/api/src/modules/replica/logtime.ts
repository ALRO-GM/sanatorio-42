/**
 * Las horas que alguien lleva conectado a ordenadores del clúster, en total
 * (pedido por Alberto el 2026-10-26): el tercer cuadro de su estado de salud.
 *
 * Salen de `GET /v2/users/:id/locations_stats` de 42, que da lo de cada día de
 * toda su historia en una petición. Se guarda el total y se vuelve a pedir una
 * vez al día por persona como mucho, salga bien o no; si la cuota va justa, se
 * sirve lo guardado y se coge turno en la cola (`quota.ts`).
 */

import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import type { QuotaGate } from './quota.js'

/** Cada cuánto se vuelve a preguntar a 42 por las horas de alguien. */
const LOGTIME_TTL_MS = 24 * 60 * 60_000

type LogtimeOptions = {
  db: Db
  client: Pick<FortyTwoClient, 'getLocationsStats'>
  quota: QuotaGate
  log?: (message: string) => void
  now?: () => number
}

/** Segundos de una duración de 42 (`"05:12:33.123456"`); 0 si no se entiende. */
export function secondsOf(value: unknown): number {
  if (typeof value !== 'string') return 0

  const match = /^(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/.exec(value.trim())

  if (match === null) return 0

  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

/** El total de segundos de un `locations_stats`. */
export function totalSeconds(stats: Record<string, unknown>): number {
  return Object.values(stats).reduce<number>((sum, value) => sum + secondsOf(value), 0)
}

export function createLogtime(options: LogtimeOptions) {
  const { db, client, quota } = options
  const now = options.now ?? Date.now
  const log = options.log ?? (() => undefined)
  /** Cuándo se preguntó a 42 por última vez por cada persona. En memoria: basta. */
  const asked = new Map<string, number>()

  return {
    /**
     * Las horas de clúster de alguien, o `null` si aún no se saben (42 no ha
     * contestado nunca o no hay cuota y espera turno).
     *
     * @param userId Su id en 42; sin él se sirve lo guardado.
     */
    async hoursOf(login: string, userId: number | null): Promise<number | null> {
      const result = await db.execute({
        sql: 'SELECT seconds, updated_at FROM user_logtime WHERE login = ?',
        args: [login],
      })
      const row = result.rows[0]
      const known = row === undefined ? null : toNumber(row.seconds) / 3600
      const age = row === undefined ? Infinity : now() - Date.parse(toText(row.updated_at))
      const tried = now() - (asked.get(login) ?? -Infinity) < LOGTIME_TTL_MS

      if (age < LOGTIME_TTL_MS || tried || userId === null) return known
      if (!(await quota.defer(login, 'logtime'))) return known

      asked.set(login, now())

      try {
        const seconds = totalSeconds(await client.getLocationsStats(userId))

        await db.execute({
          sql: `INSERT INTO user_logtime (login, seconds, updated_at) VALUES (?, ?, ?)
                ON CONFLICT (login) DO UPDATE SET
                  seconds = excluded.seconds, updated_at = excluded.updated_at`,
          args: [login, seconds, new Date(now()).toISOString()],
        })

        return seconds / 3600
      } catch (error) {
        log(`[logtime] ${login}: ${error instanceof Error ? error.message : String(error)}`)

        return known
      }
    },
  }
}

export type Logtime = ReturnType<typeof createLogtime>
