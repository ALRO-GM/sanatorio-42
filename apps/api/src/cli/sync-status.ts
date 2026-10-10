/**
 * Estado de la réplica de 42, sin levantar el servidor.
 *
 * Responde a "¿cuánto llevamos copiado?" y "¿de cuándo son los puestos?", que
 * es lo primero que hay que mirar cuando alguien dice que no le sale gente.
 *
 * No hace ninguna petición a 42: solo lee la base.
 *
 * Uso:
 *
 *   npm run sync:status
 */

import { createApiClient } from '../integrations/forty-two/create-client.js'
import { loadEnv } from '../config/env.js'
import { closeDatabase, openDatabase } from '../core/db/database.js'
import { compose } from '../app/composition.js'
import { syncConfigFrom } from '../modules/replica/index.js'

const env = loadEnv()
const db = await openDatabase({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN })

try {
  const { sync } = compose(db, createApiClient(env), { sync: syncConfigFrom(env) }).services
  const status = await sync.status()
  const ago = (iso: string | null): string =>
    iso === null ? 'nunca' : `hace ${Math.round((Date.now() - Date.parse(iso)) / 60_000)} min`

  process.stdout.write(
    `Réplica: ${status.replica.users} personas, ${status.replica.projectUsers} filas de ` +
      `proyectos, ${status.replica.projects} proyectos, ${status.replica.present} en un puesto.\n`,
  )

  for (const campus of status.campuses) {
    const { phase, rows, total } = campus.backfill
    const progress =
      phase === 'done'
        ? 'completa'
        : total === null
          ? `copiando lo que está en curso (${rows} filas)`
          : `${Math.min(99, Math.round((rows / total) * 100))} % (${rows} de ${total} filas)`

    process.stdout.write(
      `Campus ${campus.id}: copia ${progress}; puestos ${ago(campus.locationsAt)}; ` +
        `cambios ${ago(campus.deltaAt)}.\n`,
    )
  }
} finally {
  closeDatabase(db)
}
