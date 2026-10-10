/**
 * Avanza la réplica sin levantar el servidor.
 *
 * Sirve para dejar el campus copiado antes de abrir la web (el relleno inicial
 * de Madrid son ~1 600 peticiones, algo más de dos horas) o para ponerla al día
 * a mano. Hace lo mismo que el bucle de `main.ts`, y se puede cortar con
 * Ctrl+C en cualquier momento: el progreso está en la base y se retoma.
 *
 * Uso:
 *
 *   npm run sync:run              hasta que no quede nada pendiente
 *   npm run sync:run -- --watch   sin parar, como el servidor
 */

import { createApiClient } from '../integrations/forty-two/create-client.js'
import { loadEnv } from '../config/env.js'
import { closeDatabase, openDatabase } from '../core/db/database.js'
import { compose } from '../app/composition.js'
import { syncConfigFrom } from '../modules/replica/index.js'

const env = loadEnv()
const watch = process.argv.includes('--watch')
const db = await openDatabase({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN })
const { sync } = compose(db, createApiClient(env), {
  sync: syncConfigFrom(env),
  log: (message) => process.stdout.write(`[42] ${message}\n`),
}).services

let stopping = false

process.on('SIGINT', () => {
  stopping = true
})

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

/** `true` mientras quede algún campus por copiar. */
async function copying(): Promise<boolean> {
  return (await sync.status()).campuses.some((campus) => campus.backfill.phase !== 'done')
}

try {
  let steps = 0

  for (;;) {
    if (stopping as boolean) {
      break
    }

    const worked = await sync.tick()

    if (worked) {
      steps += 1

      if (steps % 25 === 0) {
        const status = await sync.status()
        const rows = status.campuses.map((campus) => campus.backfill.rows).join(', ')
        process.stdout.write(
          `${steps} pasos, ${rows} filas copiadas, quedan ${status.hourlyRemaining ?? '?'} peticiones esta hora\n`,
        )
      }
      continue
    }

    // Sin trabajo ahora mismo: o se ha acabado, o toca esperar (ritmo del
    // relleno, o la reserva de cuota).
    if (!watch && !(await copying())) {
      break
    }

    await sleep(Math.max(1_000, env.SYNC_BACKFILL_INTERVAL_MS))
  }

  process.stdout.write(`Hecho: ${steps} pasos.\n`)
} finally {
  closeDatabase(db)
}
