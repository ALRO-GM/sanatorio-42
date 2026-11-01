/**
 * Las kickoffs reales de cada campus copiado (`core/kickoffs.ts`): qué días
 * entró mucha gente, cuánta, y cuánta entró a destiempo. Solo lee.
 *
 *   npm run kickoffs
 */

import { closeDatabase, openDatabase } from '../core/db/database.js'
import { toNumber, toText } from '../core/db/rows.js'
import { realKickoffs } from '../core/kickoffs.js'
import { loadEnv } from '../config/env.js'

const DAY_MS = 86_400_000
/** La misma holgura que en `core/kickoffs.ts`. */
const WINDOW_MS = 7 * DAY_MS

const env = loadEnv()
const db = await openDatabase({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN })

try {
  const rows = await db.execute(`SELECT c.campus_id, COALESCE(k.name, '') AS name, c.begin_at
                                 FROM core_cursus c LEFT JOIN campuses k ON k.id = c.campus_id
                                 WHERE c.begin_at IS NOT NULL`)
  const byCampus = new Map<number, { name: string; starts: number[] }>()

  for (const row of rows.rows) {
    const campus = toNumber(row.campus_id)
    const entry = byCampus.get(campus) ?? { name: toText(row.name), starts: [] }

    entry.starts.push(Date.parse(toText(row.begin_at)))
    byCampus.set(campus, entry)
  }

  for (const [campus, { name, starts }] of byCampus) {
    const kickoffs = realKickoffs(starts)
    const inside = (start: number) => kickoffs.some((day) => Math.abs(day - start) <= WINDOW_MS)
    const late = starts.filter((start) => !inside(start)).length

    process.stdout.write(`\n${name} (${String(campus)}): ${String(starts.length)} personas\n`)
    for (const day of kickoffs) {
      const people = starts.filter((start) => Math.abs(day - start) <= WINDOW_MS).length

      process.stdout.write(`  ${new Date(day).toISOString().slice(0, 10)}  ${String(people)}\n`)
    }
    process.stdout.write(`  a destiempo: ${String(late)}\n`)
  }
} finally {
  closeDatabase(db)
}
