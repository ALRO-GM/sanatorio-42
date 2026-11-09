/**
 * El uso de cada puesto ya sumado (`seat_usage`, `docs/asientos.md`): cuánto
 * tiempo usó cada persona cada puesto cada día (UTC), medido igual que la red
 * de asientos (`countedSpan`). El mapa de calor lo lee de aquí en vez de
 * recorrer todo el historial de sesiones cada vez: con «todo» en París eran
 * tres millones de sesiones y decenas de segundos.
 *
 * Lo pasado no cambia, así que se suma una sola vez. Lo que falta por sumar
 * son las sesiones cuyo `seen_at` no es el ya sumado (`counted_seen_at`): las
 * nuevas y las abiertas que se han alargado desde la última vuelta. De cada
 * una se suma la diferencia entre lo que mide ahora y lo que medía.
 *
 * Se guarda con el login, y no solo las horas, porque la gente distinta no se
 * puede sumar entre días (quien se sienta lunes y martes es una persona) y
 * porque cada cual solo cuenta a quien puede ver (`worldOf`).
 */

import { breathe } from '../../core/breathe.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText, toTextOrNull } from '../../core/db/rows.js'
import { isoAt } from '../../core/time.js'
import { parseHost } from '../map/index.js'
import type { SeatTotal } from './seating.heat.js'
import { countedSpan } from './seating.sessions.js'

const DAY_MS = 86_400_000

/** Sesiones por tanda: cada una es una escritura en la base con todo lo suyo. */
const PAGE = 2_000

/** Un día `YYYY-MM-DD` (UTC) de un instante. */
export const dayOf = (at: number): string => isoAt(at).slice(0, 10)

/** Cuánto cae de `[begin, end)` en cada día (UTC). */
function byDay(begin: number, end: number, add: (day: string, ms: number) => void): void {
  for (let start = Math.floor(begin / DAY_MS) * DAY_MS; start < end; start += DAY_MS) {
    const ms = Math.min(end, start + DAY_MS) - Math.max(begin, start)

    if (ms > 0) add(dayOf(start), ms)
  }
}

/** Quién cuenta: solo esos (`only`, un piscinero) o todos menos esos (`except`). */
export type UsageWorld = { only: readonly string[] | null; except: readonly string[] }

export type SeatUsage = {
  /**
   * Suma lo que falte, por tandas. La primera vez es todo el historial (unos
   * minutos); después, lo de la última hora. Al acabar apunta hasta cuándo.
   */
  step: () => Promise<number>
  /** Hasta cuándo está sumado todo, o `null` si la primera suma no ha acabado. */
  through: () => Promise<string | null>
  /** Lo usado en un campus entre dos días (incluidos), por puesto y por clúster. */
  totals: (
    campusId: number,
    from: string,
    to: string,
    world: UsageWorld,
  ) => Promise<{ hosts: Map<string, SeatTotal>; clusters: Map<string, SeatTotal> }>
}

export function createSeatUsage(options: {
  db: Db
  now?: () => number
  log?: (message: string) => void
}): SeatUsage {
  const { db, now = Date.now, log = () => undefined } = options

  /** Una tanda de lo pendiente: cuántas sesiones ha sumado. */
  async function page(): Promise<number> {
    const result = await db.execute({
      sql: `SELECT location_id, campus_id, login, host, begin_at, first_seen_at, seen_at, counted_seen_at
            FROM seat_sessions WHERE counted_seen_at IS NOT seen_at LIMIT ?`,
      args: [PAGE],
    })
    const delta = new Map<
      string,
      { campus: number; day: string; host: string; login: string; cluster: string; ms: number }
    >()

    for (const row of result.rows) {
      const host = toText(row.host).trim().toLowerCase()
      const position = parseHost(host)

      // Lo que no se puede colocar en un plano no sale en el mapa: solo se marca.
      if (position === null) continue

      const campus = toNumber(row.campus_id)
      const login = toText(row.login).toLowerCase()
      const add = (sign: number) => (day: string, ms: number) => {
        const key = `${String(campus)}|${day}|${host}|${login}`
        const entry = delta.get(key) ?? {
          campus,
          day,
          host,
          login,
          cluster: position.cluster,
          ms: 0,
        }

        entry.ms += sign * ms
        delta.set(key, entry)
      }
      const span = countedSpan(row, -Infinity, Infinity)
      const counted = toTextOrNull(row.counted_seen_at)
      const before =
        counted === null ? null : countedSpan({ ...row, seen_at: counted }, -Infinity, Infinity)

      if (span !== null) byDay(span.begin, span.end, add(1))
      if (before !== null) byDay(before.begin, before.end, add(-1))
    }

    const sums = [...delta.values()].filter((entry) => entry.ms !== 0)

    // Todo junto: si algo falla a mitad, ni se suma ni se marca.
    await db.batch(
      [
        ...sums.map((entry) => ({
          sql: `INSERT INTO seat_usage (campus_id, day, host, login, cluster, ms)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (campus_id, day, host, login) DO UPDATE SET ms = seat_usage.ms + excluded.ms`,
          args: [entry.campus, entry.day, entry.host, entry.login, entry.cluster, entry.ms],
        })),
        // Con el `seen_at` leído, no con el de ahora: si se ha alargado mientras
        // tanto, sigue pendiente y la próxima tanda suma lo que falte.
        ...result.rows.map((row) => ({
          sql: 'UPDATE seat_sessions SET counted_seen_at = ? WHERE location_id = ?',
          args: [toText(row.seen_at), toNumber(row.location_id)],
        })),
      ],
      'write',
    )

    return result.rows.length
  }

  // Una suma a la vez: la del arranque y la de cada hora pueden coincidir.
  let running: Promise<number> | null = null

  async function sum(): Promise<number> {
    const started = now()
    let total = 0

    for (;;) {
      const done = await page()

      total += done
      if (done < PAGE) break
      // Entre tanda y tanda, que pase el resto de la web.
      await breathe()
    }

    await db.execute({
      sql: `INSERT INTO seat_usage_state (id, through) VALUES (1, ?)
              ON CONFLICT (id) DO UPDATE SET through = excluded.through`,
      args: [isoAt(started)],
    })
    if (total > PAGE) log(`uso de los puestos: ${String(total)} sesiones sumadas`)

    return total
  }

  return {
    step() {
      running ??= sum().finally(() => {
        running = null
      })

      return running
    },

    async through() {
      const result = await db.execute('SELECT through FROM seat_usage_state WHERE id = 1')

      return result.rows[0] === undefined ? null : toText(result.rows[0].through)
    },

    async totals(campusId, from, to, world) {
      const filter =
        world.only !== null
          ? {
              sql: 'AND login IN (SELECT value FROM json_each(?))',
              args: [JSON.stringify(world.only)],
            }
          : world.except.length > 0
            ? {
                sql: 'AND login NOT IN (SELECT value FROM json_each(?))',
                args: [JSON.stringify(world.except)],
              }
            : { sql: '', args: [] }
      const read = async (column: 'host' | 'cluster'): Promise<Map<string, SeatTotal>> => {
        const result = await db.execute({
          sql: `SELECT ${column} AS id, SUM(ms) AS ms, COUNT(DISTINCT login) AS people
                FROM seat_usage
                WHERE campus_id = ? AND day >= ? AND day <= ? ${filter.sql}
                GROUP BY ${column}`,
          args: [campusId, from, to, ...filter.args],
        })

        return new Map(
          result.rows.map((row) => [
            toText(row.id),
            { ms: toNumber(row.ms), people: toNumber(row.people) },
          ]),
        )
      }
      const [hosts, clusters] = await Promise.all([read('host'), read('cluster')])

      return { hosts, clusters }
    },
  }
}
