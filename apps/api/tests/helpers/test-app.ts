/**
 * Entorno de pruebas para la app entera.
 *
 * Monta un entorno válido, una base en memoria y un proveedor de 42 simulado,
 * para poder levantar la app completa sin red ni ficheros sucios.
 */

import { buildApp } from '../../src/app/build-app.js'
import type { BuiltApp } from '../../src/app/build-app.js'
import { loadEnv } from '../../src/config/env.js'
import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import { base32Decode, codeAt, stepOf } from '../../src/modules/admin/totp.js'
import { sign } from '../../src/modules/auth/signed-cookie.js'
import type { Env } from '../../src/config/env.js'
import { activeLocation, projectUser, userId } from './fixtures.js'

/** Entorno válido, con lo único que no se puede inventar siendo parametrizado. */
/** El `SESSION_SECRET` de las pruebas: con él se firman sesiones de otras personas. */
const SECRET = 'secreto-de-sesion-para-pruebas-de-treinta-y-dos'

function makeEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): Env {
  return loadEnv({
    FORTY_TWO_UID: 'u-test',
    FORTY_TWO_SECRET: 's-test',
    SESSION_SECRET: SECRET,
    FRONTEND_ORIGINS: 'https://front.test',
    FRONTEND_URL: 'https://front.test',
    FORTY_TWO_REDIRECT_URI: 'https://back.test/api/auth/callback',
    // El ritmo de la API son 2 peticiones por segundo. En los tests eso solo
    // añadiría segundos de espera, así que se deja casi a cero: los tests del
    // `Throttle` ya cubren el retraso con reloj falso.
    MIN_REQUEST_INTERVAL_MS: '0',
    // Los tests no escriben nada en la salida; el que quiera leer el registro
    // pasa su propio destino a `makeApp` y sube el nivel.
    LOG_LEVEL: 'silent',
    ...overrides,
  })
}

/** Petición registrada por el proveedor simulado. */
type Recorded = {
  url: string
  method: string
  body: string
  authorization: string
}

type ProviderOptions = {
  /** Perfil que devuelve `/v2/me`. */
  profile?: unknown
  /** Status de `/v2/me`. 404 simula el scope de identidad sin aprobar. */
  profileStatus?: number
  /** Status de `/oauth/token`. */
  tokenStatus?: number
  /**
   * Respuesta por endpoint (ruta sin query).
   *
   * El valor es el cuerpo tal cual lo devuelve la API. Para una respuesta que
   * cambia entre llamadas, una función: `() => cuerpo`.
   */
  routes?: Record<string, RouteHandler>
}

/** Lo que devuelve `inject` en una respuesta. */
type InjectResponse = { statusCode: number; body: string; headers: Record<string, unknown> }

/**
 * Cuerpo JSON. Se declara en vez de usar `unknown` porque `unknown | (() => …)`
 * colapsa a `unknown` y el linter avisa, y además `unknown` obligaría a castear
 * en cada respuesta.
 */
type RouteBody = string | number | boolean | null | RouteBody[] | { [key: string]: RouteBody }

type RouteHandler = RouteBody | (() => RouteBody)

/**
 * Cuerpo JSON de una respuesta, ya tipado.
 *
 * `inject().json()` devuelve `any`, y usarlo tal cual dispara media docena de
 * avisos de `no-unsafe-member-access` en cada test. El cast se hace una vez
 * aquí, y los tests usan `json<Peer[]>(...)`.
 */
export function json(response: InjectResponse): unknown {
  return JSON.parse(response.body) as unknown
}

/**
 * Avatar de ejemplo con la forma que devuelve la 42 de verdad: `image` es un
 * objeto con `link` y cuatro tamaños, no una URL suelta.
 */
const AVATAR = {
  link: 'https://img/1.png',
  versions: {
    large: 'https://img/1-large.png',
    medium: 'https://img/1-medium.png',
    small: 'https://img/1-small.png',
    micro: 'https://img/1-micro.png',
  },
}

/**
 * Perfil que devuelve `/v2/me` por defecto.
 *
 * Trae el campus y los proyectos de la persona, igual que la API: de aquí sale
 * la sala de espera sin ninguna petición más.
 */
const DEFAULT_PROFILE = {
  id: 1,
  login: 'albrodri',
  image: AVATAR,
  campus_users: [{ campus_id: 22, is_primary: true }],
  // Estudiante: tiene el 42cursus (`docs/piscineros.md`).
  cursus_users: [{ cursus_id: 21, level: 3.5, begin_at: '2024-10-07T08:00:00.000Z' }],
  projects_users: [
    { id: 101, status: 'in_progress', 'validated?': null, project: { id: 10, name: 'ft_printf' } },
    { id: 102, status: 'finished', 'validated?': true, project: { id: 11, name: 'libft' } },
  ],
}

/** Rutas que la app conoce, para el proveedor simulado. */
const DEFAULT_ROUTES: Record<string, RouteHandler> = {
  '/v2/campus': [
    { id: 22, name: 'Madrid', city: 'Madrid', country: 'Spain', time_zone: 'Europe/Madrid' },
    { id: 58, name: 'Barcelona', city: 'Barcelona', country: 'Spain', time_zone: 'Europe/Madrid' },
  ],
  // Puestos ocupados ahora mismo, con la persona anidada.
  '/v2/campus/22/locations': [
    activeLocation('albrodri', 'c2r17s2'),
    activeLocation('mgomez', 'c3r7p7'),
  ] as unknown as RouteBody,
  '/v2/users/albrodri/projects_users': [],
  // La 42 devuelve a **todo** el que tiene una fila en ese proyecto, incluida
  // la persona que pregunta, así que aquí también está `albrodri`.
  //
  // `jdoe` lo aprobó y no está sentado: es al que el filtro de accionables
  // tiene que dejar fuera. `lruiz` es de otro proyecto y no debe colarse.
  '/v2/projects_users': [
    projectUser('albrodri', { id: 101 }),
    projectUser('jdoe', { id: 201, status: 'finished' }),
    projectUser('mgomez', { id: 301 }),
    projectUser('lruiz', { id: 401, projectId: 11, projectName: 'libft' }),
  ] as unknown as RouteBody,
}

export function makeProvider(options: ProviderOptions = {}) {
  const requests: Recorded[] = []
  const routes: Record<string, RouteHandler> = { ...DEFAULT_ROUTES, ...options.routes }

  const fetchImpl: typeof fetch = async (input, init) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const url = new URL(raw)
    const body = init?.body
    const headers = init?.headers as Record<string, string> | undefined

    requests.push({
      url: url.toString(),
      method: init?.method ?? 'GET',
      body: typeof body === 'string' ? body : '',
      authorization: headers?.Authorization ?? '',
    })

    if (url.pathname === '/oauth/token') {
      if (options.tokenStatus !== undefined) {
        return new Response(JSON.stringify({ error: 'invalid_grant' }), {
          status: options.tokenStatus,
        })
      }

      return new Response(
        JSON.stringify({
          access_token: 'token-de-usuario',
          token_type: 'bearer',
          expires_in: 3600,
          scope: 'public profile',
        }),
        { status: 200 },
      )
    }

    if (url.pathname === '/v2/me') {
      if (options.profileStatus !== undefined) {
        return new Response('{}', { status: options.profileStatus })
      }

      return new Response(JSON.stringify(options.profile ?? DEFAULT_PROFILE), { status: 200 })
    }

    const configured = routes[url.pathname]

    if (configured === undefined) {
      return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 })
    }

    const answer = typeof configured === 'function' ? configured() : configured
    const items = filtered(Array.isArray(answer) ? answer : [answer], url)

    // Cabeceras de paginación y de cuota, como las manda la API de verdad. Sin
    // `X-Total`, el cliente asumiría que una página con 3 elementos es el
    // proyecto entero, y los tests no probarían la paginación.
    return new Response(JSON.stringify(Array.isArray(answer) ? items : answer), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-total': String(items.length),
        'x-page': url.searchParams.get('page') ?? '1',
        'x-per-page': '100',
        'x-secondly-ratelimit-limit': '2',
        'x-secondly-ratelimit-remaining': '2',
        'x-hourly-ratelimit-limit': '1200',
        'x-hourly-ratelimit-remaining': '1197',
      },
    })
  }

  return { fetchImpl, requests, routes }
}

/**
 * Aplica los filtros de la query como lo hace la API.
 *
 * Solo los que usa el back: `filter[project_id]`, `filter[status]` y la página.
 * Un proyecto que no existe devuelve una lista vacía, no un `404`: en la API es
 * un filtro más.
 */
function filtered(items: RouteBody[], url: URL): RouteBody[] {
  const projectId = url.searchParams.get('filter[project_id]')
  const status = url.searchParams.get('filter[status]')

  // Todo cabe en la primera página; pedir la segunda es llegar al final.
  if (Number(url.searchParams.get('page') ?? '1') > 1) {
    return []
  }

  return items.filter((item) => {
    const row = item as { status?: string; project?: { id?: number } }

    return (
      (projectId === null || row.project?.id === Number(projectId)) &&
      (status === null || row.status === status)
    )
  })
}

export type TestApp = BuiltApp & {
  provider: ReturnType<typeof makeProvider>
  /**
   * Login completo, como lo haría un navegador.
   *
   * Devuelve el par `nombre=valor` listo para mandar como cabecera `Cookie`.
   */
  login: () => Promise<string>
  /**
   * Login de quien administra, con el panel ya abierto: se da de alta en el
   * segundo factor (leyendo el secreto del QR y calculando el código, como haría
   * la app del móvil) y devuelve las dos cookies juntas para la cabecera `Cookie`.
   */
  adminLogin: () => Promise<string>
}

/**
 * App completa, con `inject` de Fastify.
 *
 * `inject` hace las peticiones por dentro del proceso, sin abrir un puerto:
 * los tests van mil veces más rápido y no hay puertos que colisionen.
 *
 * Es `async` porque abrir la base con `@libsql/client` y aplicar las
 * migraciones lo son; la promesa devuelve la app ya montada y migrada.
 */
export async function makeApp(
  envOverrides: Partial<NodeJS.ProcessEnv> = {},
  providerOptions: ProviderOptions = {},
  buildOptions: { logDestination?: { write: (line: string) => void } } = {},
): Promise<TestApp> {
  const env = makeEnv(envOverrides)
  const provider = makeProvider(providerOptions)

  // Base en memoria A PROPÓSITO. Sin esto, `buildApp` abriría el fichero real
  // `data/sanatorio.db` y todos los tests compartirían el mismo estado: el
  // `available: true` de un test se colaría en otro y los fallos dependerían
  // del orden de ejecución.
  const db = await openDatabase({ url: 'file::memory:' })
  const built = await buildApp({ env, db, fetchImpl: provider.fetchImpl, ...buildOptions })

  async function login(): Promise<string> {
    const start = await built.app.inject({ method: 'GET', url: '/auth/login' })
    const stateCookie = cookieValue(start.headers['set-cookie'], '__Host-sanatorio_oauth_state')
    const authorize = new URL(String(start.headers.location))
    const state = authorize.searchParams.get('state') ?? ''

    const callback = await built.app.inject({
      method: 'GET',
      url: `/auth/callback?code=codigo&state=${encodeURIComponent(state)}`,
      headers: { cookie: stateCookie },
    })

    if (callback.statusCode !== 302) {
      throw new Error(`el login falló con ${callback.statusCode}: ${callback.body}`)
    }

    return cookieValue(callback.headers['set-cookie'], '__Host-sanatorio_session')
  }

  async function adminLogin(): Promise<string> {
    const session = await login()
    const setup = await built.app.inject({
      method: 'POST',
      url: '/admin/totp/setup',
      headers: { cookie: session },
    })
    const secret = new URL((JSON.parse(setup.body) as { uri: string }).uri).searchParams.get(
      'secret',
    )
    const bytes = base32Decode(secret ?? '')

    if (setup.statusCode !== 200 || bytes === null) {
      throw new Error(`el alta del segundo factor falló con ${setup.statusCode}: ${setup.body}`)
    }

    const confirm = await built.app.inject({
      method: 'POST',
      url: '/admin/totp/confirm',
      headers: { cookie: session, 'content-type': 'application/json' },
      payload: { code: codeAt(bytes, stepOf(Date.now())) },
    })

    if (confirm.statusCode !== 204) {
      throw new Error(
        `el código del segundo factor falló con ${confirm.statusCode}: ${confirm.body}`,
      )
    }

    return `${session}; ${cookieValue(confirm.headers['set-cookie'], '__Host-sanatorio_admin')}`
  }

  return {
    ...built,
    provider,
    login,
    adminLogin,
    close: async () => {
      await built.app.close()
      closeDatabase(db)
    },
  }
}

/**
 * Saca una cookie de un `Set-Cookie` de Fastify.
 *
 * Devuelve el par `nombre=valor` completo, que es lo que hay que mandar en la
 * cabecera `Cookie` de la petición siguiente. Devolver solo el valor hace que el
 * servidor no la encuentre y parece un fallo de sesión.
 */
export function cookieValue(setCookie: unknown, name: string): string {
  const cookies = Array.isArray(setCookie)
    ? setCookie
    : typeof setCookie === 'string'
      ? [setCookie]
      : []

  for (const cookie of cookies) {
    const text = String(cookie)
    const start = text.indexOf(`${name}=`)

    if (start === -1) {
      continue
    }

    return text.slice(start).split(';')[0] ?? ''
  }

  throw new Error(`no se ha encontrado la cookie ${name} en ${JSON.stringify(setCookie)}`)
}

/**
 * Una cookie de sesión como la de `base` (la de `login()`), pero de otra
 * persona y grupo: para probar lo que ve cada cual sin pasar por 42.
 */
export function cookieAs(base: string, login: string, aud: 'student' | 'pool'): string {
  const [name = '', value = ''] = base.split('=')
  const payload = JSON.parse(
    Buffer.from(value.split('.')[0] ?? '', 'base64url').toString('utf8'),
  ) as Record<string, unknown>
  const next = { ...payload, id: userId(login), login, role: aud, aud, campusId: 22 }

  return `${name}=${sign(SECRET, Buffer.from(JSON.stringify(next)).toString('base64url'))}`
}
