/**
 * Recorre **todas** las rutas de la app, una a una.
 *
 * No prueba qué hace cada ruta (eso es de los tests de cada módulo), sino lo que
 * tienen que cumplir todas: sin sesión no se entra, lo de `/admin` es solo de
 * quien administra, una cuenta bloqueada no pasa, y ninguna entrada, por rara
 * que sea, acaba en un error interno.
 *
 * La lista sale de la propia app (`built.routes`): una ruta nueva entra aquí
 * sola, sin que nadie se acuerde de apuntarla.
 */

import { afterEach, describe, expect, it } from 'vitest'

import { TELEMETRY_PER_MINUTE } from '../../src/modules/usage/index.js'
import { makeApp } from '../helpers/test-app.js'
import type { TestApp } from '../helpers/test-app.js'

const apps: TestApp[] = []

async function app(...args: Parameters<typeof makeApp>): Promise<TestApp> {
  const built = await makeApp(...args)
  apps.push(built)
  return built
}

afterEach(async () => {
  for (const built of apps.splice(0)) await built.close()
})

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** Lo que no pide sesión: salud, el propio login y el preflight de CORS. */
const OPEN = new Set([
  'GET /health',
  'GET /health/db',
  'GET /auth/login',
  'GET /auth/callback',
  'POST /auth/logout',
  'POST /auth/staff',
  // Los fallos de la web, también de la pantalla de entrada (con tope por IP).
  'POST /client-errors',
  // El aviso de la piscina cerrada sale en la pantalla de entrada (`docs/piscineros.md`).
  'GET /pool/notice',
  'OPTIONS /*',
])

function routesOf(built: TestApp): { method: Method; url: string }[] {
  return built.routes
    .filter((route) => route.method !== 'OPTIONS')
    .map((route) => ({ method: route.method as Method, url: route.url }))
}

/** La ruta con sus `:parámetros` cambiados por un valor. */
function fill(url: string, value: string): string {
  return url.replace(/:[a-zA-Z]+/g, encodeURIComponent(value))
}

const hasBody = (method: Method): boolean => method === 'POST' || method === 'PUT'

async function call(
  built: TestApp,
  method: Method,
  url: string,
  cookie: string | null,
  body?: unknown,
): Promise<number> {
  const response = await built.app.inject({
    method,
    url,
    headers: {
      ...(cookie === null ? {} : { cookie }),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { payload: JSON.stringify(body) }),
  })

  return response.statusCode
}

describe('todas las rutas', () => {
  it('hay rutas que recorrer, y entre ellas las de administración', async () => {
    const routes = routesOf(await app())

    expect(routes.length).toBeGreaterThan(100)
    expect(routes.filter((route) => route.url.startsWith('/admin')).length).toBeGreaterThan(20)
  })

  it('sin sesión, todo lo que no es público da 401', async () => {
    const built = await app()
    const failed: string[] = []

    for (const { method, url } of routesOf(built)) {
      if (OPEN.has(`${method} ${url}`)) continue

      const status = await call(
        built,
        method,
        fill(url, '1'),
        null,
        hasBody(method) ? {} : undefined,
      )

      if (status !== 401) failed.push(`${method} ${url} → ${status}`)
    }

    expect(failed).toEqual([])
  })

  it('con una cookie inventada o caducada, lo mismo', async () => {
    const built = await app()
    const failed: string[] = []

    for (const cookie of [
      '__Host-sanatorio_session=inventada',
      '__Host-sanatorio_session=eyJsb2dpbiI6ImFsYnJvZHJpIn0.AAAA',
      '__Host-sanatorio_session=',
      `__Host-sanatorio_session=${'x'.repeat(20_000)}`,
    ]) {
      for (const { method, url } of routesOf(built)) {
        if (OPEN.has(`${method} ${url}`)) continue

        const status = await call(
          built,
          method,
          fill(url, '1'),
          cookie,
          hasBody(method) ? {} : undefined,
        )

        if (status !== 401) failed.push(`${method} ${url} → ${status}`)
      }
    }

    expect(failed).toEqual([])
  })

  it('quien no administra recibe 403 en todo lo de /admin', async () => {
    const built = await app()
    const cookie = await built.login()
    const failed: string[] = []

    for (const { method, url } of routesOf(built)) {
      if (!url.startsWith('/admin')) continue

      const status = await call(
        built,
        method,
        fill(url, '1'),
        cookie,
        hasBody(method) ? {} : undefined,
      )

      if (status !== 403) failed.push(`${method} ${url} → ${status}`)
    }

    expect(failed).toEqual([])
  })

  it('una ruta de /admin que no existe tampoco le dice nada a quien no administra', async () => {
    const built = await app()
    const cookie = await built.login()

    expect(await call(built, 'GET', '/admin/no-existe', cookie)).toBe(403)
    expect(await call(built, 'GET', '/admin', cookie)).toBe(403)
    expect(await call(built, 'GET', '/api/admin/people', cookie)).toBe(403)
    expect(await call(built, 'GET', '/admin/people?x=1', cookie)).toBe(403)
    expect(await call(built, 'GET', '/admin/no-existe', null)).toBe(401)
  })

  it('quien administra sí entra en las de lectura, con el panel abierto', async () => {
    const built = await app({ ADMIN_LOGINS: 'albrodri' })
    const cookie = await built.adminLogin()
    const failed: string[] = []

    for (const { method, url } of routesOf(built)) {
      if (!url.startsWith('/admin') || method !== 'GET' || url.includes(':')) continue

      const status = await call(built, method, url, cookie)

      // Alguna pide un parámetro obligatorio: 400 es entrar y que te lo digan.
      if (status !== 200 && status !== 400) failed.push(`${method} ${url} → ${status}`)
    }

    expect(failed).toEqual([])
  })

  it('una cuenta bloqueada no pasa por ninguna, salvo las de sesión', async () => {
    const built = await app()
    const cookie = await built.login()

    await built.db.execute({
      sql: `INSERT INTO user_blocks (login, reason, until, blocked_by, created_at)
            VALUES ('albrodri', 'prueba', NULL, 'test', '2026-01-01T00:00:00.000Z')`,
      args: [],
    })

    const failed: string[] = []

    for (const { method, url } of routesOf(built)) {
      if (url.startsWith('/auth/') || url.startsWith('/health')) continue

      const status = await call(
        built,
        method,
        fill(url, '1'),
        cookie,
        hasBody(method) ? {} : undefined,
      )

      if (status !== 403) failed.push(`${method} ${url} → ${status}`)
    }

    expect(failed).toEqual([])
    expect(await call(built, 'GET', '/auth/me', cookie)).toBe(200)
  })
})

/** Valores para los `:parámetros` y las consultas: lo normal y los extremos. */
const PARAMS = [
  '1',
  '0',
  '-1',
  '99999999999999999999999',
  '1.5',
  '1e9',
  'abc',
  ' ',
  '%',
  '..%2F..',
  "'; DROP TABLE users; --",
  '<script>alert(1)</script>',
  'ñ€😀',
  'a'.repeat(3000),
]

/** Cuerpos: vacíos, de otro tipo, con valores enormes, negativos y anidados. */
const BODIES: unknown[] = [
  undefined,
  {},
  [],
  null,
  'texto',
  0,
  { id: 'x', login: 'x', kind: 'x' },
  { id: -1, projectId: -1, day: '0000-00-00', from: 'ayer', to: 'mañana' },
  { id: Number.MAX_SAFE_INTEGER, projectId: 1e308, perHour: -5, days: 1e9, admin: 'sí' },
  { login: 'a'.repeat(5000), reason: 'a'.repeat(5000), body: 'a'.repeat(20_000) },
  { title: '', body: '', subject: '', answer: '', text: '' },
  { starts: '9999-12-31T23:59:59.999Z', startsAt: '9999-12-31T23:59:59.999Z', date: '1970-01-01' },
  { slots: [-1, 48, 999, 1.5, 'x'], seats: ['x', null, 1], dates: ['x'] },
  { a: { b: { c: { d: { e: { f: [1, [2, [3, [4]]]] } } } } } },
  { __proto__: { admin: true }, constructor: { prototype: { admin: true } } },
]

const QUERIES = [
  '',
  '?id=&from=&to=&q=&login=&days=&campuses=',
  '?id=x&from=2026-13-45&to=0000-00-00&q=%25_&login=all&days=-1&campuses=all&project=abc',
  `?id=${'9'.repeat(40)}&from=9999-12-31&to=1970-01-01&q=${'a'.repeat(2000)}&days=1e99&campuses=1,2,x`,
  '?id[]=1&id[]=2&from[a]=b&q=a&q=b',
]

describe('ninguna entrada acaba en un error interno', () => {
  for (const admin of [false, true]) {
    it(`${admin ? 'administrando' : 'sin administrar'}: parámetros, consultas y cuerpos extremos`, async () => {
      const built = await app(admin ? { ADMIN_LOGINS: 'albrodri' } : {})
      // Administrando, con el panel abierto: si no, todo lo de /admin daría 403 sin mirar la entrada.
      const cookie = admin ? await built.adminLogin() : await built.login()
      const failed: string[] = []

      for (const { method, url } of routesOf(built)) {
        // Salir de la sesión dejaría sin ella al resto del recorrido.
        if (url.startsWith('/auth/')) continue

        const tries: { url: string; body?: unknown }[] = []

        for (const value of url.includes(':') ? PARAMS : ['']) {
          for (const query of method === 'GET' ? QUERIES : ['']) {
            tries.push({ url: `${fill(url, value)}${query}` })
          }
        }
        if (hasBody(method) || method === 'DELETE') {
          for (const body of BODIES) tries.push({ url: fill(url, '1'), body })
        }

        for (const attempt of tries) {
          const status = await call(built, method, attempt.url, cookie, attempt.body)

          if (status >= 500) {
            failed.push(
              `${method} ${attempt.url.slice(0, 90)} ${JSON.stringify(attempt.body ?? '').slice(0, 60)} → ${status}`,
            )
          }
        }
      }

      expect(failed).toEqual([])
    }, 120_000)
  }

  it('un cuerpo que no es JSON, o demasiado grande, se rechaza sin romper nada', async () => {
    const built = await app()
    const cookie = await built.login()

    const broken = await built.app.inject({
      method: 'POST',
      url: '/tickets',
      headers: { cookie, 'content-type': 'application/json' },
      payload: '{"kind": ',
    })
    const huge = await built.app.inject({
      method: 'POST',
      url: '/tickets',
      headers: { cookie, 'content-type': 'application/json' },
      payload: JSON.stringify({ body: 'a'.repeat(2 * 1024 * 1024) }),
    })
    const form = await built.app.inject({
      method: 'POST',
      url: '/tickets',
      headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'kind=bug&subject=x',
    })

    expect(broken.statusCode).toBe(400)
    expect(huge.statusCode).toBe(413)
    // Un formulario de otra web no puede mandar JSON sin permiso de CORS, y lo
    // que sí puede mandar (un formulario clásico) no se entiende.
    expect(form.statusCode).toBe(415)
  })
})

describe('lo que no tiene sesión también tiene tope', () => {
  it('el login por IP: pasa hasta el tope y luego vuelve a la web con el motivo', async () => {
    const built = await app()
    const statuses: string[] = []

    for (let index = 0; index < 205; index += 1) {
      const response = await built.app.inject({ method: 'GET', url: '/auth/login' })

      statuses.push(String(response.headers.location).includes('rate_limited') ? 'tope' : 'ok')
    }

    expect(statuses.slice(0, 200).every((status) => status === 'ok')).toBe(true)
    expect(statuses.slice(200)).toEqual(['tope', 'tope', 'tope', 'tope', 'tope'])
  })

  it('pasado el tope, la vuelta de 42 no llega a canjear nada', async () => {
    const built = await app()

    for (let index = 0; index < 200; index += 1) {
      await built.app.inject({ method: 'GET', url: '/auth/login' })
    }

    const before = built.provider.requests.length
    const response = await built.app.inject({
      method: 'GET',
      url: '/auth/callback?code=x&state=y',
    })

    expect(response.statusCode).toBe(302)
    expect(String(response.headers.location)).toContain('error=rate_limited')
    expect(built.provider.requests.length).toBe(before)
  })
})

describe('lo que devuelve la API no se guarda en ningún sitio', () => {
  it('una respuesta sin instrucciones propias lleva no-store', async () => {
    const built = await app()
    const cookie = await built.login()
    const mine = await built.app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } })
    const denied = await built.app.inject({
      method: 'GET',
      url: '/admin/people',
      headers: { cookie },
    })

    expect(mine.headers['cache-control']).toBe('private, no-store')
    expect(denied.headers['cache-control']).toBe('private, no-store')
  })

  it('la que trae las suyas las conserva', async () => {
    const built = await app()
    const cookie = await built.login()
    const usage = await built.app.inject({ method: 'GET', url: '/usage', headers: { cookie } })

    expect(usage.headers['cache-control']).toBe('private, max-age=300')
  })
})

describe('estadística de uso', () => {
  it('pasado el tope por minuto, los envíos se tiran sin mirarlos ni dar error', async () => {
    const built = await app()
    const cookie = await built.login()
    const post = (url: string) =>
      built.app.inject({
        method: 'POST',
        url,
        headers: { cookie, 'content-type': 'application/json' },
        payload: JSON.stringify({ counts: { roto: 1 } }),
      })

    // Mal hecho, se rechaza mientras se apunta…
    expect((await post('/usage')).statusCode).toBe(400)
    for (let sent = 1; sent < TELEMETRY_PER_MINUTE; sent += 1) await post('/usage/clicks')
    // …y pasado el tope ya ni se mira: es estadística.
    expect((await post('/usage')).statusCode).toBe(204)
    expect((await post('/usage/clicks')).statusCode).toBe(204)
  })
})
