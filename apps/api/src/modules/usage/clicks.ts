/**
 * Mapa de calor de clics (#69 del buzón). La web junta los clics de cada
 * sección y los manda cada poco, sin login: aquí solo se suman por día. Sirve
 * para ver si la gente pulsa cosas que no hacen nada (y espera que hagan algo).
 */

import type { ClickHeatmap } from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import { assertAdmin } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { parse } from '../../core/validation.js'

/** Columnas de la rejilla y alto de cada fila, en px. Igual que en la web. */
const CLICK_COLUMNS = 24
const CLICK_ROW_PX = 40
/** Filas como mucho: 6000 px de página. Lo de más abajo va a la última. */
const MAX_ROWS = 150
const DAY_MS = 86_400_000

const batchSchema = z.object({
  section: z.string().regex(/^[a-z][a-z0-9-]{0,30}$/),
  layout: z.enum(['mobile', 'desktop']),
  cells: z
    .array(
      z.object({
        x: z
          .number()
          .int()
          .min(0)
          .max(CLICK_COLUMNS - 1),
        y: z
          .number()
          .int()
          .min(0)
          .max(MAX_ROWS - 1),
        n: z.number().int().min(1).max(500),
      }),
    )
    .max(400),
  elements: z
    .array(
      z.object({
        // Etiqueta y clase: `img.avatar`, `button.pill`. Nada de texto.
        element: z.string().regex(/^[a-z][a-z0-9]*(\.[a-zA-Z0-9_-]{1,40})?$/),
        interactive: z.boolean(),
        n: z.number().int().min(1).max(500),
      }),
    )
    .max(150),
})

const querySchema = z.object({
  section: z
    .string()
    .regex(/^[a-z][a-z0-9-]{0,30}$/)
    .optional(),
  layout: z.enum(['mobile', 'desktop']).default('desktop'),
  days: z.coerce.number().int().min(1).max(90).default(30),
})

export function createClicksService(db: Db, now: () => number = Date.now) {
  const dayOf = (ms: number): string => new Date(ms).toISOString().slice(0, 10)

  return {
    async record(_actor: Actor, input: unknown): Promise<void> {
      const batch = parse(batchSchema, input)
      const day = dayOf(now())

      if (batch.cells.length === 0 && batch.elements.length === 0) return

      await db.batch(
        [
          ...batch.cells.map((cell) => ({
            sql: `INSERT INTO usage_click_cells (day, section, layout, x, y, n) VALUES (?, ?, ?, ?, ?, ?)
                  ON CONFLICT (day, section, layout, x, y) DO UPDATE SET n = n + excluded.n`,
            args: [day, batch.section, batch.layout, cell.x, cell.y, cell.n],
          })),
          ...batch.elements.map((element) => ({
            sql: `INSERT INTO usage_click_elements (day, section, element, interactive, n) VALUES (?, ?, ?, ?, ?)
                  ON CONFLICT (day, section, element, interactive) DO UPDATE SET n = n + excluded.n`,
            args: [day, batch.section, element.element, element.interactive ? 1 : 0, element.n],
          })),
        ],
        'write',
      )
    },

    async heatmap(actor: Actor, input: unknown): Promise<ClickHeatmap> {
      assertAdmin(actor)

      const query = parse(querySchema, input)
      const since = dayOf(now() - (query.days - 1) * DAY_MS)
      const sections = (
        await db.execute({
          sql: `SELECT section, SUM(n) AS n FROM usage_click_cells WHERE day >= ? GROUP BY section ORDER BY n DESC`,
          args: [since],
        })
      ).rows.map((row) => toText(row.section))
      const section = query.section ?? sections[0] ?? 'expediente'
      const [cells, elements] = await Promise.all([
        db.execute({
          sql: `SELECT x, y, SUM(n) AS n FROM usage_click_cells
                WHERE day >= ? AND section = ? AND layout = ? GROUP BY x, y`,
          args: [since, section, query.layout],
        }),
        db.execute({
          sql: `SELECT element, interactive, SUM(n) AS n FROM usage_click_elements
                WHERE day >= ? AND section = ? GROUP BY element, interactive ORDER BY n DESC LIMIT 60`,
          args: [since, section],
        }),
      ])

      return {
        section,
        layout: query.layout,
        days: query.days,
        columns: CLICK_COLUMNS,
        rowPx: CLICK_ROW_PX,
        cells: cells.rows.map((row) => ({
          x: toNumber(row.x),
          y: toNumber(row.y),
          n: toNumber(row.n),
        })),
        elements: elements.rows.map((row) => ({
          element: toText(row.element),
          interactive: toNumber(row.interactive) === 1,
          n: toNumber(row.n),
        })),
        sections,
      }
    },
  }
}
