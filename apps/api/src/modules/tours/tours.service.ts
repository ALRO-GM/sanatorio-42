/**
 * La velocidad de las demostraciones animadas, que se ajusta sola.
 *
 * Cada demostración tiene un deslizador de velocidad. La web dice a cuánto la
 * ha visto cada persona, respecto a la de fábrica: `1` si no la tocó, más si la
 * aceleró, menos si la frenó. Cuando ya la ha visto bastante gente, la de
 * fábrica se mueve lo que la haya movido la gente de media, y se vuelve a
 * contar desde cero.
 *
 * Cuenta todo el mundo, también quien la deja como está: así dos personas con
 * prisa no le cambian el ritmo a las demás.
 */

import type { TourSpeeds, TourSpeedStats } from '@sanatorio/contracts'
import { z } from 'zod'

import { assertAdmin } from '../../core/actor.js'
import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { parse } from '../../core/validation.js'
import { isoAt } from '../../core/time.js'

/** Lo más lento y lo más rápido que puede poner alguien el deslizador. */
const MIN_RATE = 0.5
const MAX_RATE = 2
/** Personas distintas que tienen que haberla visto para ajustar la velocidad. */
export const VOTES_TO_ADJUST = 8
/** Entre qué valores se mueve la velocidad de fábrica, por mucho que empuje la gente. */
const MIN_SPEED = 0.5
const MAX_SPEED = 3
/** Por debajo de esto, la media es «la dejan como está»: no se toca. */
const DEAD_ZONE = 0.05

const rateSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_-]{1,39}$/, 'nombre no válido'),
  rate: z.number().min(MIN_RATE).max(MAX_RATE),
})

/**
 * La media de lo que ha movido la gente la velocidad. Geométrica: acelerar al
 * doble y frenar a la mitad se compensan, que es lo justo hablando de
 * velocidades.
 */
export function meanRate(rates: readonly number[]): number {
  if (rates.length === 0) return 1

  return Math.exp(rates.reduce((sum, rate) => sum + Math.log(rate), 0) / rates.length)
}

export function createToursService(options: { db: Db; now?: () => number }) {
  const { db } = options
  const now = options.now ?? Date.now
  const iso = (): string => isoAt(now())

  return {
    /** A cuánto va cada demostración de fábrica. Las que no salen van a `1`. */
    async speeds(): Promise<TourSpeeds> {
      const result = await db.execute('SELECT name, speed FROM tour_speeds')

      return {
        speeds: Object.fromEntries(result.rows.map((row) => [toText(row.name), Number(row.speed)])),
      }
    },

    /**
     * Apunta a cuánto ha visto alguien una demostración. Si con esa ya la ha
     * visto bastante gente, ajusta la velocidad de fábrica y vuelve a contar.
     *
     * @returns La velocidad de fábrica que queda.
     */
    async rate(actor: Actor, input: unknown): Promise<{ speed: number }> {
      const { name, rate } = parse(rateSchema, input)

      await db.execute({
        sql: `INSERT INTO tour_rates (name, login, rate, at) VALUES (?, ?, ?, ?)
              ON CONFLICT (name, login) DO UPDATE SET rate = excluded.rate, at = excluded.at`,
        args: [name, actor.login, rate, iso()],
      })

      const [votes, current] = await Promise.all([
        db.execute({ sql: 'SELECT rate FROM tour_rates WHERE name = ?', args: [name] }),
        db.execute({ sql: 'SELECT speed FROM tour_speeds WHERE name = ?', args: [name] }),
      ])
      const speed = Number(current.rows[0]?.speed ?? 1)

      if (votes.rows.length < VOTES_TO_ADJUST) return { speed }

      const mean = meanRate(votes.rows.map((row) => Number(row.rate)))
      // Si de media la dejan como está, no se mueve; pero se vuelve a contar.
      const next =
        Math.abs(mean - 1) < DEAD_ZONE
          ? speed
          : Math.min(MAX_SPEED, Math.max(MIN_SPEED, Math.round(speed * mean * 100) / 100))

      await db.batch(
        [
          {
            sql: `INSERT INTO tour_speeds (name, speed, updated_at) VALUES (?, ?, ?)
                  ON CONFLICT (name) DO UPDATE SET speed = excluded.speed,
                                                   updated_at = excluded.updated_at`,
            args: [name, next, iso()],
          },
          { sql: 'DELETE FROM tour_rates WHERE name = ?', args: [name] },
        ],
        'write',
      )

      return { speed: next }
    },

    /**
     * Cómo va cada demostración: su velocidad de fábrica y, desde el último
     * ajuste, cuánta gente la ha acelerado, frenado o dejado. Solo para quien
     * administra la web.
     *
     * @throws {DomainError} `forbidden` si quien pregunta no es admin.
     */
    async stats(actor: Actor): Promise<TourSpeedStats> {
      assertAdmin(actor)

      const [speeds, votes] = await Promise.all([
        db.execute('SELECT name, speed, updated_at FROM tour_speeds'),
        db.execute('SELECT name, rate FROM tour_rates'),
      ])
      const tours = new Map<string, TourSpeedStats['tours'][number] & { rates: number[] }>()
      const of = (name: string) => {
        const found = tours.get(name) ?? {
          name,
          speed: 1,
          faster: 0,
          slower: 0,
          same: 0,
          mean: 1,
          adjustedAt: null,
          rates: [],
        }

        tours.set(name, found)

        return found
      }

      for (const row of speeds.rows) {
        const tour = of(toText(row.name))

        tour.speed = Number(row.speed)
        tour.adjustedAt = toText(row.updated_at)
      }
      for (const row of votes.rows) {
        const tour = of(toText(row.name))
        const rate = Number(row.rate)

        tour.rates.push(rate)
        if (rate > 1) tour.faster += 1
        else if (rate < 1) tour.slower += 1
        else tour.same += 1
      }

      return {
        votesToAdjust: VOTES_TO_ADJUST,
        tours: [...tours.values()]
          .map(({ rates, ...tour }) => ({
            ...tour,
            mean: Math.round(meanRate(rates) * 100) / 100,
          }))
          .sort((a, b) => (a.name < b.name ? -1 : 1)),
      }
    },

    /** Cuánta gente ha opinado de una demostración desde el último ajuste. Para los tests. */
    async votes(name: string): Promise<number> {
      const result = await db.execute({
        sql: 'SELECT COUNT(*) AS total FROM tour_rates WHERE name = ?',
        args: [name],
      })

      return toNumber(result.rows[0]?.total ?? 0)
    },
  }
}

export type ToursService = ReturnType<typeof createToursService>
