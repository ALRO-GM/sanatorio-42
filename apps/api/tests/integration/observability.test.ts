/**
 * Lo que la app deja escrito cuando algo va mal: el identificador de cada
 * petición y el registro de los errores internos.
 *
 * Es lo único que permite relacionar lo que cuenta una persona ("me ha salido
 * un error") con lo que pasó dentro, así que se comprueba desde fuera: la
 * cabecera que ve el navegador y la línea que llega a la salida.
 */

import { afterEach, describe, expect, it } from 'vitest'

import { loadEnv } from '../../src/config/env.js'
import { closeDatabase } from '../../src/core/db/database.js'
import { json, makeApp } from '../helpers/test-app.js'
import type { TestApp } from '../helpers/test-app.js'

const apps: TestApp[] = []

afterEach(async () => {
  for (const built of apps.splice(0)) {
    await built.close()
  }
})

/** Destino del registro que guarda cada línea, ya como objeto. */
function collector(): { lines: Record<string, unknown>[]; write: (line: string) => void } {
  const lines: Record<string, unknown>[] = []

  return {
    lines,
    write: (line) => {
      lines.push(JSON.parse(line) as Record<string, unknown>)
    },
  }
}

/** App con el registro a `warn` (lo de producción) escribiendo en `log`. */
async function appLoggingTo(
  log: { write: (line: string) => void },
  env: Partial<NodeJS.ProcessEnv> = {},
): Promise<TestApp> {
  const built = await makeApp({ LOG_LEVEL: 'warn', ...env }, {}, { logDestination: log })
  apps.push(built)

  return built
}

const requestId = (headers: Record<string, unknown>): string => String(headers['x-request-id'])

describe('x-request-id', () => {
  it('va en cada respuesta, también en las que fallan, y no se repite', async () => {
    const built = await makeApp()
    apps.push(built)

    const ok = await built.app.inject({ method: 'GET', url: '/health' })
    const unauthenticated = await built.app.inject({ method: 'GET', url: '/auth/me' })
    const missing = await built.app.inject({ method: 'GET', url: '/no-existe' })

    expect(ok.statusCode).toBe(200)
    expect(unauthenticated.statusCode).toBe(401)
    expect(missing.statusCode).toBe(404)

    const ids = [ok, unauthenticated, missing].map((response) => requestId(response.headers))

    for (const id of ids) {
      // 9 bytes al azar en base64url: 12 caracteres, sin nada que se repita
      // entre arranques (el `req-1` de serie sí se repetía).
      expect(id).toMatch(/^[A-Za-z0-9_-]{12}$/)
    }
    expect(new Set(ids).size).toBe(3)
  })

  it('no se coge el que mande el cliente', async () => {
    const built = await makeApp()
    apps.push(built)

    const response = await built.app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': 'inventado-por-el-cliente' },
    })

    expect(requestId(response.headers)).not.toBe('inventado-por-el-cliente')
  })
})

describe('registro de errores', () => {
  it('un 500 deja una línea a nivel error con el mismo id que la cabecera', async () => {
    const log = collector()
    const built = await appLoggingTo(log)
    const cookie = await built.login()
    closeDatabase(built.db)

    const response = await built.app.inject({
      method: 'GET',
      url: '/me/profile',
      headers: { cookie },
    })

    expect(response.statusCode).toBe(500)
    const line = log.lines.find((entry) => entry.msg === 'error no controlado')
    expect(line).toBeDefined()
    expect(line?.level).toBe(50)
    expect(line?.requestId).toBe(requestId(response.headers))
    expect(line?.reqId).toBe(requestId(response.headers))
    expect(line?.status).toBe(500)
    expect(line?.route).toBe('/me/profile')
    expect(line?.err).toMatchObject({ message: expect.any(String) })
  })

  it('la línea no lleva la cookie ni ninguna cabecera de la petición', async () => {
    const log = collector()
    const built = await appLoggingTo(log)
    const cookie = await built.login()
    closeDatabase(built.db)

    await built.app.inject({ method: 'GET', url: '/me/profile', headers: { cookie } })

    const text = JSON.stringify(log.lines)
    expect(log.lines.length).toBeGreaterThan(0)
    expect(text).not.toContain(cookie.split('=')[1])
    expect(text).not.toContain('__Host-sanatorio_session')
    expect(text).not.toMatch(/"headers"/)
  })

  it('los errores de cliente (401, 404, 400) no ensucian el registro a warn', async () => {
    const log = collector()
    const built = await appLoggingTo(log)
    const cookie = await built.login()

    await built.app.inject({ method: 'GET', url: '/auth/me' })
    await built.app.inject({ method: 'GET', url: '/no-existe' })
    await built.app.inject({
      method: 'GET',
      url: '/projects/abc/peers',
      headers: { cookie },
    })

    expect(log.lines).toEqual([])
  })

  it('en los tests el registro va en silencio: ni los 500 escriben', async () => {
    const log = collector()
    const built = await makeApp({}, {}, { logDestination: log })
    apps.push(built)
    const cookie = await built.login()
    closeDatabase(built.db)

    const response = await built.app.inject({
      method: 'GET',
      url: '/me/profile',
      headers: { cookie },
    })

    expect(response.statusCode).toBe(500)
    expect(log.lines).toEqual([])
  })

  it('con LOG_REQUESTS se registra cada petición, sin su cookie', async () => {
    const log = collector()
    const built = await appLoggingTo(log, { LOG_REQUESTS: 'true' })
    const cookie = await built.login()
    log.lines.length = 0

    const response = await built.app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie },
    })

    expect(response.statusCode).toBe(200)
    const completed = log.lines.find((entry) => entry.msg === 'request completed')
    expect(completed).toBeDefined()
    expect(completed?.reqId).toBe(requestId(response.headers))
    expect(JSON.stringify(log.lines)).not.toContain(cookie.split('=')[1])
  })

  it('sin LOG_REQUESTS no hay una línea por petición', async () => {
    const log = collector()
    const built = await appLoggingTo(log, { LOG_LEVEL: 'info' })

    await built.app.inject({ method: 'GET', url: '/health' })

    expect(log.lines.filter((entry) => entry.msg === 'request completed')).toEqual([])
  })

  it('la salud degradada también se registra con su id', async () => {
    const log = collector()
    const built = await appLoggingTo(log)
    closeDatabase(built.db)

    const response = await built.app.inject({ method: 'GET', url: '/health/db' })

    expect(response.statusCode).toBe(503)
    expect(json(response)).toMatchObject({ status: 'degraded' })
    const line = log.lines.find((entry) => entry.msg === 'no se pudo consultar la base')
    expect(line?.requestId).toBe(requestId(response.headers))
  })
})

describe('configuración del registro', () => {
  const minimal = {
    FORTY_TWO_UID: 'u',
    FORTY_TWO_SECRET: 's',
    SESSION_SECRET: 'secreto-de-sesion-para-pruebas-de-treinta-y-dos',
    FRONTEND_URL: 'https://front.test',
    FORTY_TWO_REDIRECT_URI: 'https://back.test/api/auth/callback',
  }

  it('por defecto el nivel es warn y no se registran las peticiones', () => {
    const env = loadEnv(minimal)

    expect(env.LOG_LEVEL).toBe('warn')
    expect(env.LOG_REQUESTS).toBe('false')
    expect(env.GIT_SHA).toBe('')
  })

  it('un nivel que no existe no arranca', () => {
    expect(() => loadEnv({ ...minimal, LOG_LEVEL: 'ruidoso' })).toThrow()
  })
})
