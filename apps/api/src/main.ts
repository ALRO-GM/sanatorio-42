/**
 * Punto de entrada del servidor.
 *
 * Todo el trabajo está en `app/`; aquí solo se abre el puerto, se arranca el
 * trabajo de fondo y se apaga sin dejar nada colgando.
 */

import { buildApp } from './app/build-app.js'
import { loadEnv } from './config/env.js'

const env = loadEnv()
const built = await buildApp({ env, logger: env.LOG_REQUESTS === 'true' })
const { app } = built

let closing = false

/** Apagado ordenado: dejar de aceptar conexiones, parar la sincronización y cerrar la base. */
async function shutdown(signal: string): Promise<void> {
  if (closing) {
    return
  }
  closing = true

  process.stdout.write(`${signal} recibido, cerrando\n`)

  try {
    await built.close()
    process.exitCode = 0
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`apagado con errores: ${message}\n`)
    process.exitCode = 1
  }
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void shutdown(signal)
  })
}

try {
  await app.listen({ port: env.PORT, host: env.HOST })
  process.stdout.write(`escuchando en ${env.HOST}:${env.PORT}\n`)

  built.start()

  if (env.SYNC_ENABLED === 'true') {
    process.stdout.write(`sincronizando los campus ${env.syncCampusIds.join(', ')}\n`)
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`no se pudo arrancar: ${message}\n`)
  process.exitCode = 1
}
