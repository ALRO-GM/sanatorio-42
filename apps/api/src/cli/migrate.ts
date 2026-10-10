/**
 * Aplica las migraciones pendientes y sale.
 *
 * El servidor ya las aplica al arrancar; esto sirve para migrar sin levantarlo
 * (por ejemplo, antes de un despliegue) y ver qué se ha aplicado.
 *
 *   npm run db:migrate
 */

import { closeDatabase, migrate, openDatabase, schemaVersion } from '../core/db/database.js'
import { LATEST_VERSION, MIGRATIONS } from '../core/db/migrations/index.js'
import { loadEnv } from '../config/env.js'

const env = loadEnv()
const db = await openDatabase({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_AUTH_TOKEN,
})

try {
  const before = await schemaVersion(db)
  const applied = await migrate(db)

  if (applied.length === 0) {
    process.stdout.write(`Base de datos al día (versión ${before}).\n`)
  } else {
    const names = MIGRATIONS.filter((m) => applied.includes(m.version))
      .map((m) => `${m.version} (${m.name})`)
      .join(', ')

    process.stdout.write(`Migraciones aplicadas: ${names}\n`)
    process.stdout.write(`De la versión ${before} a la ${LATEST_VERSION}.\n`)
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`No se pudo migrar: ${message}\n`)
  process.exitCode = 1
} finally {
  closeDatabase(db)
}
