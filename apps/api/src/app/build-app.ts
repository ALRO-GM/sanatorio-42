/**
 * Montaje del servidor.
 *
 * Se separa del punto de entrada (`main.ts`) para poder levantar la app entera
 * en los tests de integración sin abrir un puerto.
 *
 * Aquí no hay lógica de negocio ni rutas: se abre la base, se componen los
 * módulos (`composition.ts`) y se le pide a cada uno que registre lo suyo.
 */

import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import Fastify, { LogController } from 'fastify'
import type { FastifyInstance } from 'fastify'

import { loadEnv } from '../config/env.js'
import type { Env } from '../config/env.js'
import { assertSchemaIsCurrent, closeDatabase, openDatabase } from '../core/db/database.js'
import type { Db } from '../core/db/database.js'
import { registerStatic } from '../core/http/static.js'
import type { AppModule } from '../core/module.js'
import { createApiClient } from '../integrations/forty-two/create-client.js'
import { createSlackPoster } from '../integrations/slack.js'
import { createAuthModule } from '../modules/auth/index.js'
import { diskPhotoStore, syncConfigFrom } from '../modules/replica/index.js'
import { compose } from './composition.js'
import type { Services } from './composition.js'
import { registerCors } from './cors.js'
import { registerErrorHandler } from './error-handler.js'
import { registerHealth } from './health.js'

type BuildOptions = {
  env?: Env
  /** Conexión ya abierta. En los tests, para poder inspeccionarla. */
  db?: Db
  /** `fetch` inyectable, para los tests de integración. */
  fetchImpl?: typeof fetch
  /** Reloj inyectable, para los tests que dependen de la hora. */
  now?: () => number
  /**
   * Dónde escribe el registro. Por defecto, la salida estándar; los tests
   * pasan un destino propio para leer lo que se registra.
   */
  logDestination?: { write: (line: string) => void }
}

export type BuiltApp = {
  app: FastifyInstance
  env: Env
  db: Db
  services: Services
  /** Todas las rutas registradas. Para los tests que las recorren una a una. */
  routes: readonly { method: string; url: string }[]
  /** Arranca el trabajo de fondo de los módulos (la sincronización con 42). */
  start: () => void
  close: () => Promise<void>
}

/**
 * Carpeta de las fotos de perfil: junto a la base si es un fichero (en el
 * contenedor, `/data/photos`, en el volumen que ya se guarda), y si no, `data/photos`.
 */
function photoDirOf(databaseUrl: string): string {
  const file = databaseUrl.startsWith('file:') ? databaseUrl.slice('file:'.length) : ''

  return file === '' || file.startsWith(':memory:')
    ? join('data', 'photos')
    : join(dirname(file), 'photos')
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
    slack: createSlackPoster(env.SLACK_WEBHOOK_URL, (detail) => {
      process.stderr.write(`[slack] ${detail}\n`)
    }),
    photos: diskPhotoStore(photoDirOf(env.DATABASE_URL)),
    secret: env.SESSION_SECRET,
    ...(env.GUARD_LEVEL_FILE === ''
      ? {}
      : {
          // Sin fichero, o vacío, no hay corte de la guardia.
          guardLevel: async () =>
            guardLevelFrom(await readFile(env.GUARD_LEVEL_FILE, 'utf8').catch(() => '')),
        }),
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
    staff: (key) => services.staff.authenticate(key),
  })

  const modules: AppModule[] = [auth, ...domainModules]
  /** Temporizadores de los trabajos periódicos, para pararlos al cerrar. */
  const timers: NodeJS.Timeout[] = []

  // Con `LOG_REQUESTS` se registra cada petición, y eso solo sale a nivel `info`.
  const logRequests = env.LOG_REQUESTS === 'true'
  const logLevel = logRequests && env.LOG_LEVEL !== 'debug' ? 'info' : env.LOG_LEVEL

  const app = Fastify({
    // Siempre encendido: a `warn` solo escribe lo que va mal (un 500 y poco
    // más), que es justo lo que hace falta leer tras un despliegue. Sin
    // cuerpos ni cookies: Fastify registra de la petición solo método, ruta y
    // origen, y lo que sí llevaría una cookie o un token se quita por si acaso.
    logger: {
      level: logLevel,
      ...(options.logDestination === undefined ? {} : { stream: options.logDestination }),
      redact: {
        paths: [
          'req.headers.cookie',
          'req.headers.authorization',
          'res.headers["set-cookie"]',
          'err.config.headers.authorization',
        ],
        remove: true,
      },
    },
    logController: new LogController({ disableRequestLogging: !logRequests }),
    // Un identificador por petición que no se repite entre arranques (el
    // `req-1` de serie sí): es lo que une la cabecera `x-request-id` que ve una
    // persona con la línea del registro.
    genReqId: () => randomBytes(9).toString('base64url'),
    // Siempre hay un proxy delante (Caddy) que añade `x-forwarded-for`.
    trustProxy: true,
    // Sin límite de cuerpo, un POST gigante se come la memoria.
    bodyLimit: 64 * 1024,
    // En producción la API cuelga de `/api` (así la web y la API comparten
    // dominio) y en local va en la raíz. Quitando el prefijo aquí valen las dos
    // sin registrar cada ruta dos veces.
    rewriteUrl: (request) => stripApiPrefix(request.url ?? '/'),
  })

  const routes: { method: string; url: string }[] = []

  app.addHook('onRoute', (route) => {
    for (const method of [route.method].flat()) {
      // Fastify añade un HEAD por cada GET: es la misma ruta.
      if (method !== 'HEAD') routes.push({ method, url: route.url })
    }
  })

  // El identificador va en cada respuesta, también en las que fallan: con él
  // se encuentra la línea del registro (`reqId`) de lo que alguien cuenta.
  app.addHook('onRequest', (request, reply, done) => {
    reply.header('x-request-id', request.id)
    done()
  })

  registerCors(app, env.allowedOrigins)
  registerErrorHandler(app)
  registerHealth(app, {
    db,
    version: env.GIT_SHA === '' ? null : env.GIT_SHA,
    lastSyncAt: () => services.sync.lastSyncAt(),
    now: options.now ?? Date.now,
  })

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
    routes,
    start: () => {
      for (const module of modules) {
        module.start?.()

        for (const job of module.jobs ?? []) {
          timers.push(
            setInterval(() => {
              // Con un corte por el límite del plan no corre nada de fondo: no
              // tiene que salir tráfico aunque no haya nadie. Lo de `admin` sí:
              // es quien guarda la cuenta de lo servido.
              if (module.name !== 'admin' && services.admin.halted()) return

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
function stripApiPrefix(url: string): string {
  if (url === '/api' || url.startsWith('/api?')) {
    return `/${url.slice('/api'.length)}`
  }

  return url.startsWith('/api/') ? url.slice('/api'.length) : url
}

/**
 * El corte que pide la guardia de la máquina, a partir de lo que deja escrito
 * en su fichero: el porcentaje del límite más gastado.
 *
 * Al 90 % solo entra quien administra; al 95 %, nadie. Un fichero vacío, que no
 * existe o que no trae un número no corta nada: la web lleva además su propia
 * cuenta del tráfico, y manda el peor de los dos.
 */
export function guardLevelFrom(text: string): 'ok' | 'admin_only' | 'stopped' {
  const percent = Number(text.trim())

  return percent >= 95 ? 'stopped' : percent >= 90 ? 'admin_only' : 'ok'
}
