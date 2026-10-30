/**
 * Informe de uso de la web, para analizarlo sin tocar nada (pedido por
 * Alberto, 2026-10-30: que Claude pueda mirar el uso por su cuenta para
 * mejorar la organización y los recursos). `docs/uso-informe.md`.
 *
 * Solo lee, y solo saca cifras agregadas: ningún login, ni nada con lo que
 * se pueda saber qué hizo una persona. Lo que tiene menos de `MIN_PEOPLE`
 * personas detrás no sale. Escribe JSON por la salida.
 *
 *   node dist/cli/usage-report.js [días]   (en el contenedor; de 1 a 90, 30 si no)
 *
 * En el servidor lo lanza `infra/scripts/uso.sh`, que es lo único que puede
 * ejecutar la llave SSH de solo lectura (`command=` en `authorized_keys`).
 */

import { createClient } from '@libsql/client'

import { toNumber, toText } from '../core/db/rows.js'

/** Con menos gente detrás, una fila podría señalar a alguien: no sale. */
const MIN_PEOPLE = 3
const DAY_MS = 86_400_000

const asked = Number(process.argv[2] ?? '30')
const days = Number.isInteger(asked) ? Math.min(90, Math.max(1, asked)) : 30
const since = new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10)
const sinceHour = `${since}T00`

// El cliente a pelo y no `openDatabase`, que migra al abrir: esto no escribe
// nada. Solo la base, sin el resto del entorno (claves de 42, sesión).
const db = createClient({
  url: process.env.DATABASE_URL ?? 'file:/data/sanatorio.db',
  intMode: 'number',
  ...(process.env.DATABASE_AUTH_TOKEN === undefined
    ? {}
    : { authToken: process.env.DATABASE_AUTH_TOKEN }),
})

/** Ejecuta una consulta de lectura y devuelve sus filas como objetos planos. */
async function rows(sql: string, args: (string | number)[] = []) {
  if (!/^\s*SELECT\b/i.test(sql)) throw new Error('Solo consultas de lectura')

  const result = await db.execute({ sql, args })

  return result.rows.map((row) =>
    Object.fromEntries(
      result.columns.map((column) => {
        const value = row[column]

        return [column, typeof value === 'string' ? toText(value) : toNumber(value)]
      }),
    ),
  )
}

try {
  const report = {
    generatedAt: new Date().toISOString(),
    days,
    since,
    minPeople: MIN_PEOPLE,
    /** Gente distinta que abrió la web cada día. */
    dailyPeople: await rows(
      `SELECT day, COUNT(DISTINCT login) AS people FROM usage_time
       WHERE day >= ? GROUP BY day ORDER BY day`,
      [since],
    ),
    /** Cada sección o elemento (`key`): gente, clics y horas a la vista, de fondo y oculta. */
    sections: await rows(
      `SELECT key, COUNT(DISTINCT login) AS people, SUM(clicks) AS clicks,
              ROUND(SUM(seen_s) / 3600.0, 1) AS seenHours,
              ROUND(SUM(back_s) / 3600.0, 1) AS backHours,
              ROUND(SUM(hidden_s) / 3600.0, 1) AS hiddenHours
       FROM usage_time WHERE day >= ?
       GROUP BY key HAVING COUNT(DISTINCT login) >= ? ORDER BY seenHours DESC`,
      [since, MIN_PEOPLE],
    ),
    /** A qué hora (UTC) se usa: gente y horas a la vista. */
    byHour: await rows(
      `SELECT hour, COUNT(DISTINCT login) AS people, ROUND(SUM(seen_s) / 3600.0, 1) AS seenHours
       FROM usage_time WHERE day >= ? GROUP BY hour ORDER BY hour`,
      [since],
    ),
    /** De qué sección se pasa a cuál: los 80 caminos más andados. */
    flows: await rows(
      `SELECT from_key AS "from", to_key AS "to", SUM(count) AS times,
              COUNT(DISTINCT login) AS people
       FROM usage_flows WHERE day >= ?
       GROUP BY from_key, to_key HAVING COUNT(DISTINCT login) >= ?
       ORDER BY times DESC LIMIT 80`,
      [since, MIN_PEOPLE],
    ),
    /** Los elementos más pulsados de cada sección, y los que no son botones pero se pulsan. */
    clickedElements: await rows(
      `SELECT section, element, interactive, SUM(n) AS clicks
       FROM usage_click_elements WHERE day >= ?
       GROUP BY section, element, interactive ORDER BY clicks DESC LIMIT 200`,
      [since],
    ),
    /** Los contadores de uso (`usage_counts`, de siempre): veces y gente por clave. */
    counters: await rows(
      `SELECT key, SUM(count) AS times, COUNT(*) AS people FROM usage_counts
       GROUP BY key HAVING COUNT(*) >= ? ORDER BY times DESC`,
      [MIN_PEOPLE],
    ),
    /** Peticiones a la API de 42 por función y día (la cuota). */
    apiByFeature: await rows(
      `SELECT substr(hour, 1, 10) AS day, feature, SUM(requests) AS requests
       FROM api_usage WHERE hour >= ? GROUP BY day, feature ORDER BY day, requests DESC`,
      [sinceHour],
    ),
  }

  process.stdout.write(`${JSON.stringify(report)}\n`)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`No se pudo sacar el informe: ${message}\n`)
  process.exitCode = 1
} finally {
  db.close()
}
