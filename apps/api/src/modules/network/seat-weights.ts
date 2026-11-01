/**
 * Los pesos de los puestos de la red de asientos (`docs/asientos.md`), que
 * quien administra puede cambiar desde el panel (pedido por Alberto,
 * 2026-11-01).
 *
 * Viven en `settings` (clave `seatWeights`). Sin nada guardado valen los de
 * siempre (`DEFAULT_SEAT_WEIGHTS`). La red de asientos lleva en la clave de su
 * caché la firma de los pesos: al guardarlos se recalcula sola.
 */

import type { SeatWeightsState } from '@sanatorio/contracts'
import { z } from 'zod'

import { assertAdmin } from '../../core/actor.js'
import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { isoAt } from '../../core/time.js'
import { parse } from '../../core/validation.js'
import { DEFAULT_SEAT_WEIGHTS, SEAT_REACH } from './seating.rules.js'
import type { SeatWeights } from './seating.rules.js'

/** Lo leído vale este rato: cada petición del grafo lo mira. Guardar lo olvida. */
const TTL_MS = 30_000

/** Lo más que pesa un puesto: más no aporta y desequilibra. */
const MAX_SEAT_WEIGHT = 10

const ROWS = 3
const COLUMNS = SEAT_REACH * 2 + 1

const weight = z
  .number()
  .min(0, 'un peso no baja de 0')
  .max(MAX_SEAT_WEIGHT, `un peso no pasa de ${MAX_SEAT_WEIGHT}`)
  .transform((value) => Math.round(value * 100) / 100)

/** Tres filas de siete pesos; el del centro (la propia persona) se queda en 0. */
export const seatWeightsSchema = z
  .array(z.array(weight).length(COLUMNS, `cada fila lleva ${COLUMNS} pesos`))
  .length(ROWS, `van ${ROWS} filas`)
  .transform((grid) =>
    grid.map((row, at) =>
      row.map((value, column) => (at === 1 && column === SEAT_REACH ? 0 : value)),
    ),
  )

const storedSchema = z.object({ grid: seatWeightsSchema })

/** Una firma corta de unos pesos: para la clave de la caché. */
export function weightsKey(grid: SeatWeights): string {
  return grid.map((row) => row.join(',')).join(';')
}

export function createSeatWeights(options: { db: Db; now?: () => number }) {
  const { db, now = Date.now } = options
  let cached: { at: number; value: Promise<SeatWeightsState> } | null = null

  const read = async (): Promise<SeatWeightsState> => {
    const result = await db.execute(
      "SELECT value, updated_by, updated_at FROM settings WHERE key = 'seatWeights'",
    )
    const row = result.rows[0]
    const fallback: SeatWeightsState = {
      grid: DEFAULT_SEAT_WEIGHTS,
      defaults: DEFAULT_SEAT_WEIGHTS,
      updatedBy: null,
      updatedAt: null,
    }

    if (row === undefined || typeof row.value !== 'string') return fallback

    try {
      return {
        grid: storedSchema.parse(JSON.parse(row.value)).grid,
        defaults: DEFAULT_SEAT_WEIGHTS,
        updatedBy: typeof row.updated_by === 'string' ? row.updated_by : null,
        updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
      }
    } catch {
      // Ilegible: los de siempre antes que una red rota.
      return fallback
    }
  }

  const current = (): Promise<SeatWeightsState> => {
    if (cached !== null && now() - cached.at < TTL_MS) return cached.value

    const value = read()

    cached = { at: now(), value }
    value.catch(() => {
      cached = null
    })

    return value
  }

  return {
    /** Los pesos en uso, con los de siempre y quién los cambió. */
    current,

    /** Los pesos en uso, solo la cuadrícula. */
    async grid(): Promise<SeatWeights> {
      return (await current()).grid
    },

    /**
     * Guarda unos pesos nuevos. Solo admins.
     *
     * @throws {DomainError} `invalid_input` si la cuadrícula no es de 3 × 7 o
     *   algún peso se sale de 0 a `MAX_SEAT_WEIGHT`.
     */
    async set(actor: Actor, input: unknown): Promise<SeatWeightsState> {
      assertAdmin(actor)

      const { grid } = parse(storedSchema, input)

      await db.execute({
        sql: `INSERT OR REPLACE INTO settings (key, value, updated_by, updated_at)
              VALUES ('seatWeights', ?, ?, ?)`,
        args: [JSON.stringify({ grid }), actor.login, isoAt(now())],
      })
      cached = null

      return current()
    },
  }
}

export type SeatWeightsStore = ReturnType<typeof createSeatWeights>
