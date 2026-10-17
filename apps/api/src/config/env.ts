/**
 * Configuración del backend.
 *
 * Todas las variables de entorno se leen y validan **una sola vez**, al arrancar.
 * Si falta algo o está mal escrito, el proceso muere aquí con un mensaje claro
 * en vez de fallar más tarde con un `undefined` en la mitad de una petición.
 *
 * Nota de seguridad: el Secret de la app OAuth solo existe en este módulo y en
 * el cliente de la API. Nunca se registra en logs ni se devuelve en respuestas.
 */

import { z } from 'zod'

const envSchema = z.object({
  // --- API de 42 ---------------------------------------------------------
  /** Client ID (UID) de la aplicación OAuth. */
  FORTY_TWO_UID: z.string().min(1, 'FORTY_TWO_UID no puede estar vacía'),
  /** Client Secret de la aplicación OAuth. Es una credencial real: nunca al log. */
  FORTY_TWO_SECRET: z.string().min(1, 'FORTY_TWO_SECRET no puede estar vacía'),

  /**
   * Raíz de la API de 42.
   *
   * Se declara aquí, y no fija en el código, por dos razones: poder apuntar a
   * un servidor simulado en los tests de integración, y no tener que recompilar
   * si algún día la 42 mueve la API de sitio.
   */
  FORTY_TWO_API_BASE: z
    .url('FORTY_TWO_API_BASE debe ser una URL válida')
    .default('https://api.intra.42.fr'),
  /** Dónde se pide el token. Normalmente `${FORTY_TWO_API_BASE}/oauth/token`. */
  FORTY_TWO_TOKEN_URL: z
    .url('FORTY_TWO_TOKEN_URL debe ser una URL válida')
    .default('https://api.intra.42.fr/oauth/token'),
  /**
   * `User-Agent` obligatorio.
   *
   * La API de 42 responde `403 Forbidden` a las peticiones sin `User-Agent`, y
   * el cuerpo viene vacío, así que el error es muy difícil de diagnosticar si
   * no se sabe esto. La 42 pide un identificador propio en sus docs.
   */
  FORTY_TWO_USER_AGENT: z
    .string()
    .min(1, 'FORTY_TWO_USER_AGENT es obligatoria')
    .default('sanatorio-42/1.0'),

  // --- Servidor -----------------------------------------------------------
  /** Puerto donde escucha el backend. Solo se usa en local. */
  PORT: z.coerce.number().int().positive().default(3000),
  /** Interfaz de escucha. `0.0.0.0` para Codespaces y contenedores. */
  HOST: z.string().default('0.0.0.0'),

  // --- Frontend -----------------------------------------------------------
  /**
   * Origen(es) del frontend a los que se permite CORS con credenciales.
   *
   * En producción la web y la API se sirven desde el **mismo dominio**, así que no hay CORS que hablar y esta variable
   * no hace falta. Solo es obligatoria para desarrollo, donde Vite sirve el
   * front en `localhost:5173` y el back en `localhost:3000`.
   *
   * Si se deja vacía, se usa `FRONTEND_URL` como único origen permitido.
   */
  FRONTEND_ORIGINS: z.string().default(''),
  /** A dónde vuelve el usuario tras el login. Normalmente el front. */
  FRONTEND_URL: z.url('FRONTEND_URL debe ser una URL válida'),

  // --- OAuth --------------------------------------------------------------
  /**
   * Scopes que se piden en la URL de autorización, separados por espacios.
   *
   * El nombre exacto del scope de identidad **solo lo confirma el panel de la
   * aplicación**: `/oauth/authorize` no lo valida hasta que el usuario ya se ha
   * autenticado, así que un nombre mal escrito no falla aquí, falla después en el
   * login. Por eso va en el entorno y no hardcodeado.
   *
   * `public` es el default de la API y basta para leer proyectos y
   * participantes. `profile` es el scope de datos de usuario que aparece en el
   * panel de la app ("manage user data"); sin él, `/v2/me` responde `404 {}` y
   * el login no puede saber de quién es la sesión.
   */
  FORTY_TWO_SCOPES: z.string().default('public profile'),
  /**
   * Callback de OAuth. Debe estar registrada **carácter a carácter** en el panel
   * de la app de 42, o 42 no devolverá nunca el código.
   *
   * En producción: `https://<tu-dominio>/api/auth/callback`.
   */
  FORTY_TWO_REDIRECT_URI: z.url('FORTY_TWO_REDIRECT_URI debe ser una URL válida'),
  /**
   * Clave para firmar las cookies. Sin ella, cualquier persona podría fabricar su
   * propia cookie y hacerse pasar por otra.
   *
   * Como la sesión va dentro de la cookie firmada (no hay tabla de sesiones),
   * esta clave es lo único que impide suplantar a alguien.
   */
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET debe tener al menos 16 caracteres'),

  // --- Base de datos ------------------------------------------------------
  /**
   * Conexión a la base de datos.
   *
   * - `file:/data/sanatorio.db`: un fichero SQLite. Es lo que se usa en
   *   producción (en el volumen de Docker), en local y en los tests.
   * - `libsql://…` + `DATABASE_AUTH_TOKEN`: un servidor libSQL/Turso, por si
   *   algún día hace falta sacar la base de la máquina.
   */
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL no puede estar vacía')
    .default('file:data/sanatorio.db'),
  /**
   * Token del servidor libSQL. Solo hace falta con `libsql://`; se ignora con `file:`.
   *
   * Es una credencial real: nunca al log, nunca en git.
   */
  DATABASE_AUTH_TOKEN: z.string().default(''),

  // --- Réplica de la API de 42 ----------------------------------------------
  /** Peticiones por página a la API. El máximo de 42 es 100. */
  PAGE_SIZE: z.coerce.number().int().positive().max(100).default(100),

  /**
   * Campus por defecto, para sesiones antiguas que no lo llevan en la cookie y
   * para quien entra sin campus principal en 42. `22` es Madrid.
   */
  DEFAULT_CAMPUS_ID: z.coerce.number().int().positive().default(22),

  /**
   * Campus que se replican en segundo plano, separados por comas.
   *
   * Replicar un campus son ~1 600 peticiones una sola vez (Madrid tiene 156 671
   * filas de `projects_users`) y después unas 50-130 por hora. El resto de campus
   * funcionan igual, pero bajo demanda: solo gastan cuando alguien los mira.
   */
  SYNC_CAMPUS_IDS: z.string().default('22'),

  /**
   * Arranca el bucle de sincronización al levantar el servidor.
   *
   * Con `false` la réplica solo avanza con las llamadas críticas que se hacen
   * dentro de cada petición. Útil para depurar sin gastar cuota de 42.
   */
  SYNC_ENABLED: z.enum(['true', 'false']).default('true'),

  /**
   * Cuota horaria que el trabajo de fondo nunca toca.
   *
   * La API da 1 200 peticiones por hora y dice cuántas quedan en cada respuesta.
   * Por debajo de esta reserva el relleno histórico y los refrescos en reposo se
   * paran, y lo que queda es para logins y para quien está mirando la web.
   */
  SYNC_HOURLY_RESERVE: z.coerce.number().int().min(0).max(1200).default(300),

  /**
   * Pausa entre dos pasos del relleno histórico, en ms.
   *
   * Cada paso es una petición. Con 5 s son 720 por hora: Madrid entero se copia
   * en algo más de dos horas sin acercarse nunca al tope.
   */
  SYNC_BACKFILL_INTERVAL_MS: z.coerce.number().int().min(0).default(5_000),

  /** Cada cuánto se refrescan los puestos del campus si hay alguien usando la web. */
  LOCATIONS_TTL_SECONDS: z.coerce.number().int().positive().default(120),
  /** Lo mismo cuando no hay nadie: no tiene sentido mirar un cluster que nadie consulta. */
  LOCATIONS_IDLE_SECONDS: z.coerce.number().int().positive().default(900),

  /** Cada cuánto se piden los cambios de proyectos (`range[updated_at]`) con gente dentro. */
  DELTA_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  /** Lo mismo en reposo. */
  DELTA_IDLE_SECONDS: z.coerce.number().int().positive().default(1_800),

  /**
   * Páginas que se bajan como mucho **dentro de una petición web**.
   *
   * Solo aplica a lo que todavía no está replicado (un proyecto recién abierto
   * en un campus a medio copiar). Con el filtro por campus casi todo cabe en
   * una o dos páginas; el resto lo termina el bucle de fondo.
   */
  PEERS_PAGE_BUDGET: z.coerce.number().int().positive().max(100).default(4),

  /**
   * Logins con permiso para moderar (borrar dudas, grupos y pizarras ajenas),
   * separados por comas.
   */
  ADMIN_LOGINS: z.string().default(''),

  /**
   * Webhook de Slack («incoming webhook») del canal del staff: los avisos de
   * problemas del edificio llegan también allí. Vacío, solo en la web.
   */
  SLACK_WEBHOOK_URL: z.url().or(z.literal('')).default(''),

  /**
   * Carpeta con la web compilada (`apps/web/dist`), para servirla desde el mismo
   * proceso. Vacía en desarrollo, donde la web la sirve Vite.
   */
  STATIC_DIR: z.string().default(''),

  /**
   * Fichero donde la guardia de la máquina (`infra/scripts/limits-guard.sh`)
   * escribe a qué porcentaje del tráfico del mes se ha llegado cuando hay corte:
   * `90` o `95`. Vacío donde no hay guardia.
   */
  GUARD_LEVEL_FILE: z.string().default(''),

  /** Registra cada petición HTTP en la salida. */
  LOG_REQUESTS: z.enum(['true', 'false']).default('false'),

  /**
   * Separación mínima entre peticiones a la API de 42, en milisegundos.
   *
   * La API manda `x-secondly-ratelimit-remaining` en cada respuesta, y el
   * throttling se guía por eso (ver `api/throttle.ts`): cuando queda poca
   * cuota por segundo espera más, y cuando sobra no espera. Este valor es solo
   * el suelo, para no machacar dos peticiones seguidas en el mismo tick.
   *
   * `0` quita el suelo y deja solo las cabeceras de la API, que es lo que
   * necesitan los tests y lo que puede servir en local.
   */
  MIN_REQUEST_INTERVAL_MS: z.coerce.number().int().min(0).default(250),

  /** Timeout de las peticiones a la API de 42. */
  API_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),

  /** Intentos antes de rendirse, sin contar el primero. */
  API_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
})

/** Configuración normalizada: el entorno validado más lo derivado de él. */
export type Env = z.infer<typeof envSchema> & {
  /** Orígenes del front permitidos en CORS, sin barra final. */
  readonly allowedOrigins: readonly string[]
  /** Raíz de la API v2 de 42, con barra final. */
  readonly apiV2Base: string
  /** Scopes de OAuth ya troceados, sin entradas vacías. */
  readonly oauthScopes: readonly string[]
  /** `true` si la base es un fichero local y no un servidor libSQL. */
  readonly isLocalFile: boolean
  /** Campus que se replican en segundo plano. */
  readonly syncCampusIds: readonly number[]
  /** Logins con permiso de moderación, en minúsculas. */
  readonly adminLogins: readonly string[]
}

/**
 * Convierte la lista de orígenes del front en un array limpio.
 * Acepta coma o espacios como separador y quita la barra final.
 */
function parseOrigins(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => origin.replace(/\/$/, ''))
}

/**
 * Trocea la lista de scopes de OAuth.
 *
 * Acepta coma o espacios, como los orígenes. Se quitan las entradas vacías
 * porque un scope en blanco sí se cuela en la URL de autorización: llega un
 * `scope` con espacios de más y 42 responde `invalid_scope` sin decir cuál sobra.
 */
function parseScopes(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean)
}

/** Lista de ids numéricos separados por comas o espacios, sin repetidos. */
function parseIds(raw: string): number[] {
  const ids = raw
    .split(/[,\s]+/)
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0)

  return [...new Set(ids)]
}

/**
 * Lee el entorno, lo valida y devuelve un objeto congelado y normalizado.
 *
 * @param source Entorno de entrada. Por defecto `process.env`; los tests pasan el suyo.
 * @throws {z.ZodError} Si falta alguna variable obligatoria o es inválida.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.parse(source)

  // Sin `FRONTEND_ORIGINS` explícitos se permite solo el front de `FRONTEND_URL`,
  // que es exactamente lo que hace falta en producción al servir ambos desde el
  // mismo dominio.
  const origins = parseOrigins(parsed.FRONTEND_ORIGINS)
  const allowedOrigins =
    origins.length > 0 ? origins : [new URL(parsed.FRONTEND_URL).origin.replace(/\/$/, '')]

  const apiBase = parsed.FORTY_TWO_API_BASE.replace(/\/$/, '')
  const isLocalFile = parsed.DATABASE_URL.startsWith('file:')

  if (!isLocalFile && parsed.DATABASE_AUTH_TOKEN === '') {
    throw new Error(
      'DATABASE_URL apunta a un servidor libSQL (`libsql://`) pero DATABASE_AUTH_TOKEN está vacía.',
    )
  }

  return Object.freeze({
    ...parsed,
    allowedOrigins: Object.freeze(allowedOrigins),
    apiV2Base: `${apiBase}/v2`,
    oauthScopes: Object.freeze(parseScopes(parsed.FORTY_TWO_SCOPES)),
    isLocalFile,
    syncCampusIds: Object.freeze(parseIds(parsed.SYNC_CAMPUS_IDS)),
    adminLogins: Object.freeze(
      parseScopes(parsed.ADMIN_LOGINS).map((login) => login.toLowerCase()),
    ),
  })
}

/**
 * Variables que sin falta no puede arrancar el backend.
 *
 * `FRONTEND_ORIGINS` ya no está: en producción el front y el back comparten
 * dominio, y en local se deduce de `FRONTEND_URL`.
 */
export const REQUIRED_ENV_VARS = [
  'FORTY_TWO_UID',
  'FORTY_TWO_SECRET',
  'FORTY_TWO_REDIRECT_URI',
  'SESSION_SECRET',
  'FRONTEND_URL',
] as const
