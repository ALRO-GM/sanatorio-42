/**
 * Montaje del servidor.
 *
 * Se separa del punto de entrada (`main.ts`) para poder levantar la app entera
 * en los tests de integración sin abrir un puerto.
 *
 * Aquí no hay lógica de negocio ni rutas: se abre la base, se componen los
 * módulos (`composition.ts`) y se le pide a cada uno que registre lo suyo.
 */

import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'

import { loadEnv } from '../config/env.js'
import type { Env } from '../config/env.js'
import { assertSchemaIsCurrent, closeDatabase, openDatabase } from '../core/db/database.js'
import type { Db } from '../core/db/database.js'
import { registerStatic } from '../core/http/static.js'
import type { AppModule } from '../core/module.js'
import { createApiClient } from '../integrations/forty-two/create-client.js'
import { createAuthModule } from '../modules/auth/index.js'
import { syncConfigFrom } from '../modules/replica/index.js'
import { compose } from './composition.js'
import type { Services } from './composition.js'
import { registerCors } from './cors.js'
import { registerErrorHandler } from './error-handler.js'
import { registerHealth } from './health.js'

export type BuildOptions = {
  env?: Env
  /** Conexión ya abierta. En los tests, para poder inspeccionarla. */
  db?: Db
  /** `fetch` inyectable, para los tests de integración. */
  fetchImpl?: typeof fetch
  /** Reloj inyectable, para los tests que dependen de la hora. */
  now?: () => number
  logger?: boolean
}

export type BuiltApp = {
  app: FastifyInstance
  env: Env
  db: Db
  services: Services
  /** Arranca el trabajo de fondo de los módulos (la sincronización con 42). */
  start: () => void
  close: () => Promise<void>
}

/** Crea la app completa, sin abrir el puerto ni arrancar el trabajo de fondo. */
export async function buildApp(options: BuildOptions = {}): Promise<BuiltApp> {
  const env = options.env ?? loadEnv()

  const db =
    options.db ??
    (await openDatabase({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN }))

  if (options.db === undefined) {
    await assertSchemaIsCurrent(db)
  }

  const fetchImpl = options.fetchImpl ?? fetch

  const { services, modules: domainModules } = compose(db, createApiClient(env, fetchImpl), {
    sync: syncConfigFrom(env),
    backgroundSync: env.SYNC_ENABLED === 'true',
    admins: env.adminLogins,
    // A stderr y no al log de Fastify: el sincronizador vive fuera de las
    // peticiones. Lo que importa es que quede rastro, porque la web sigue
    // funcionando con datos viejos y sin esto no habría forma de saberlo.
    log: (detail) => {
      process.stderr.write(`[42] ${detail}\n`)
    },
    ...(options.now === undefined ? {} : { now: options.now }),
  })

  const auth = createAuthModule({
    env,
    fetchImpl,
    profiles: services.repositories.profiles,
    // El perfil de `/v2/me` trae el campus y todos los proyectos de quien entra:
    // se guarda en la réplica y la sala de espera ya no cuesta ninguna petición.
    onLogin: async (profile) => {
      const result = await services.sync.ingestLogin(profile)
      await services.repositories.profiles.touch(profile.login)

      return result
    },
    onActivity: () => {
      services.sync.touch()
    },
    access: (login) => services.admin.accessOf(login),
  })

  const modules: AppModule[] = [auth, ...domainModules]
  /** Temporizadores de los trabajos periódicos, para pararlos al cerrar. */
  const timers: NodeJS.Timeout[] = []

  const app = Fastify({
    logger: options.logger ?? false,
    // Siempre hay un proxy delante (Caddy) que añade `x-forwarded-for`.
    trustProxy: true,
    // Sin límite de cuerpo, un POST gigante se come la memoria.
    bodyLimit: 64 * 1024,
    // En producción la API cuelga de `/api` (así la web y la API comparten
    // dominio) y en local va en la raíz. Quitando el prefijo aquí valen las dos
    // sin registrar cada ruta dos veces.
    rewriteUrl: (request) => stripApiPrefix(request.url ?? '/'),
  })

  registerCors(app, env.allowedOrigins)
  registerErrorHandler(app)
  registerHealth(app, db)

  for (const module of modules) {
    module.routes?.(app, { session: auth.session })
  }

  if (env.STATIC_DIR !== '') {
    registerStatic(app, env.STATIC_DIR)
  }

  return {
    app,
    env,
    db,
    services,
    start: () => {
      for (const module of modules) {
        module.start?.()

        for (const job of module.jobs ?? []) {
          timers.push(
            setInterval(() => {
              job.run().catch((error: unknown) => {
                const message = error instanceof Error ? error.message : String(error)
                process.stderr.write(`[${job.name}] ${message}\n`)
              })
            }, job.everyMs),
          )
        }
      }
    },
    close: async () => {
      for (const timer of timers.splice(0)) {
        clearInterval(timer)
      }

      for (const module of modules) {
        await module.stop?.()
      }

      await app.close()

      if (options.db === undefined) {
        closeDatabase(db)
      }
    },
  }
}

/**
 * La ruta sin el prefijo `/api`, si lo lleva.
 *
 * Solo se mira el principio del path: un `?destino=/api/algo` no se toca.
 */
export function stripApiPrefix(url: string): string {
  if (url === '/api' || url.startsWith('/api?')) {
    return `/${url.slice('/api'.length)}`
  }

  return url.startsWith('/api/') ? url.slice('/api'.length) : url
}
