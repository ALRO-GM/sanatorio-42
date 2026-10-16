/**
 * Los cortes por el límite del plan, de punta a punta: la guardia de la máquina
 * deja un porcentaje en un fichero y la web cierra la puerta.
 *
 * Es la regla más estricta del proyecto: al 90 % solo entra quien administra y
 * al 95 %, nadie. Aquí se prueba justo en los bordes.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { guardLevelFrom } from '../../src/app/build-app.js'
import { closeDatabase } from '../../src/core/db/database.js'
import { thin } from '../../src/modules/clicker/capital.rules.js'
import { avatarUrlOf } from '../../src/integrations/forty-two/avatar.js'
import { json, makeApp } from '../helpers/test-app.js'
import type { TestApp } from '../helpers/test-app.js'

const apps: TestApp[] = []
const folders: string[] = []

afterEach(async () => {
  for (const built of apps.splice(0)) await built.close().catch(() => undefined)
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true })
})

/** App con la guardia diciendo `content`, y `albrodri` administrando o no. */
async function guarded(content: string | null, admin: boolean): Promise<TestApp> {
  const folder = mkdtempSync(join(tmpdir(), 'sanatorio-guard-'))
  const file = join(folder, 'guard-level')

  folders.push(folder)
  if (content !== null) writeFileSync(file, content)

  const built = await makeApp({
    GUARD_LEVEL_FILE: file,
    ...(admin ? { ADMIN_LOGINS: 'albrodri' } : {}),
  })

  apps.push(built)

  return built
}

const get = (built: TestApp, url: string, cookie?: string) =>
  built.app.inject({ method: 'GET', url, headers: cookie === undefined ? {} : { cookie } })

describe('lo que dice el fichero de la guardia', () => {
  it('por debajo del 90 no corta nada, también justo antes', () => {
    for (const text of ['0', '1', '50', '89', '89.9', '89.999999', ' 12 \n', '-5', '0.0']) {
      expect(guardLevelFrom(text), text).toBe('ok')
    }
  })

  it('del 90 al 95 sin llegar, solo quien administra', () => {
    for (const text of ['90', '90.0', '90.000001', '92', '94', '94.999999', ' 90\n', '9e1']) {
      expect(guardLevelFrom(text), text).toBe('admin_only')
    }
  })

  it('del 95 en adelante, nadie, por mucho que se pase', () => {
    for (const text of ['95', '95.0', '96', '100', '250', '1e9', 'Infinity', ' 95 ']) {
      expect(guardLevelFrom(text), text).toBe('stopped')
    }
  })

  it('un fichero vacío o que no trae un número no corta', () => {
    for (const text of [
      '',
      '   ',
      '\n',
      'noventa',
      '90%',
      '9O',
      'NaN',
      '{"p":99}',
      '95,5',
      '-Infinity',
    ]) {
      expect(guardLevelFrom(text), JSON.stringify(text)).toBe('ok')
    }
  })
})

describe('cortes por el límite del plan', () => {
  it('sin fichero, o con la guardia tranquila, entra todo el mundo', async () => {
    for (const content of [null, '', '0', '89.9']) {
      const built = await guarded(content, false)
      const cookie = await built.login()

      expect((await get(built, '/auth/me', cookie)).statusCode, String(content)).toBe(200)
      expect((await get(built, '/me/projects', cookie)).statusCode, String(content)).toBe(200)
    }
  })

  it('al 90 %: quien no administra se queda fuera, con cuándo volver', async () => {
    const built = await guarded('90', false)
    const cookie = await built.login()
    const refused = await get(built, '/me/projects', cookie)

    expect(refused.statusCode).toBe(503)
    expect(json(refused)).toMatchObject({ error: 'service_stopped' })
    expect(Number(refused.headers['retry-after'])).toBeGreaterThanOrEqual(60)
    // Sin sesión tampoco se pasa, ni a la portada de la API ni a una ruta que no existe.
    expect((await get(built, '/me/projects')).statusCode).toBe(503)
    expect((await get(built, '/no-existe')).statusCode).toBe(503)
    // Las de sesión siguen, para que quien administra pueda identificarse.
    expect((await get(built, '/auth/me', cookie)).statusCode).toBe(200)
    expect((await get(built, '/auth/login')).statusCode).toBe(302)
    // Y la de salud, que es lo que mira el proxy.
    expect((await get(built, '/health')).statusCode).toBe(200)
  })

  it('al 90 %: quien administra sí entra', async () => {
    const built = await guarded('90', true)
    const cookie = await built.adminLogin()

    expect((await get(built, '/me/projects', cookie)).statusCode).toBe(200)
    expect((await get(built, '/admin/consumption', cookie)).statusCode).toBe(200)
  })

  it('al 95 %: no entra nadie, ni quien administra, ni por las rutas de sesión', async () => {
    const built = await guarded('95', true)
    // El login ya no pasa: se entra con una sesión abierta antes del corte.
    const open = await guarded('0', true)
    const cookie = await open.login()

    for (const url of ['/me/projects', '/admin/consumption', '/auth/me', '/auth/login', '/']) {
      expect((await get(built, url, cookie)).statusCode, url).toBe(503)
    }

    expect((await get(built, '/health')).statusCode).toBe(200)
    expect((await get(built, '/health/db')).statusCode).toBe(200)
  })

  it('una sesión de staff tampoco pasa con el corte puesto', async () => {
    const built = await guarded('90', true)
    const admin = await built.adminLogin()
    const created = await built.app.inject({
      method: 'POST',
      url: '/admin/staff',
      headers: { cookie: admin, 'content-type': 'application/json' },
      payload: JSON.stringify({ name: 'Bocal' }),
    })
    const { key } = json(created) as { key: string }
    const entered = await built.app.inject({
      method: 'POST',
      url: '/auth/staff',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ key }),
    })
    const staff = String(entered.headers['set-cookie']).split(';')[0] ?? ''

    expect(entered.statusCode).toBe(204)
    expect((await get(built, '/staff/me', staff)).statusCode).toBe(503)
  })
})

describe('cuando falla algo por dentro', () => {
  it('con la base caída, la salud lo dice y las rutas dan un error sin detalles', async () => {
    const built = await makeApp()
    const cookie = await built.login()

    apps.push(built)
    closeDatabase(built.db)

    const health = await get(built, '/health/db')
    const route = await get(built, '/me/profile', cookie)

    expect(health.statusCode).toBe(503)
    expect(json(health)).toMatchObject({ status: 'degraded', database: 'error' })
    // La comprobación ligera sigue respondiendo: no toca la base.
    expect((await get(built, '/health')).statusCode).toBe(200)
    expect(route.statusCode).toBe(500)
    expect(json(route)).toEqual({
      error: 'internal_error',
      message: 'Algo ha ido mal por nuestra parte. Prueba de nuevo en un momento.',
    })
    expect(route.body).not.toMatch(/sqlite|libsql|closed|\.ts|\/src\//i)
  })
})

describe('bordes de dos utilidades', () => {
  const series = (length: number) =>
    Array.from({ length }, (_, index) => [index, index * 10] as [number, number])

  it('aligerar una serie: no pasa del máximo y conserva el primero y el último', () => {
    expect(thin([], 300)).toEqual([])
    expect(thin(series(1), 300)).toEqual([[0, 0]])
    expect(thin(series(300), 300)).toHaveLength(300)

    const thinned = thin(series(301), 300)

    expect(thinned).toHaveLength(300)
    expect(thinned[0]).toEqual([0, 0])
    expect(thinned.at(-1)).toEqual([300, 3000])

    const huge = thin(series(100_000), 300)

    expect(huge).toHaveLength(300)
    expect(huge.at(-1)).toEqual([99_999, 999_990])
    // Sigue en orden: aligerar no baraja.
    expect(
      huge.every((point, index) => index === 0 || point[0] > (huge[index - 1]?.[0] ?? -1)),
    ).toBe(true)
  })

  it('aligerar a un punto se queda con el último, y a cero con ninguno', () => {
    expect(thin(series(10), 1)).toEqual([[9, 90]])
    expect(thin(series(10), 0)).toEqual([])
  })

  it('la foto de perfil: el primer tamaño que sea una dirección de verdad', () => {
    const link = 'https://img/original.png'

    expect(avatarUrlOf(null)).toBeNull()
    expect(avatarUrlOf(undefined)).toBeNull()
    expect(avatarUrlOf({ link: null, versions: null })).toBeNull()
    expect(avatarUrlOf({ link: '', versions: {} })).toBeNull()
    expect(avatarUrlOf({ link, versions: null })).toBe(link)
    expect(avatarUrlOf({ link, versions: { medium: '', small: null } })).toBe(link)
    expect(avatarUrlOf({ link, versions: { medium: null, small: 'https://img/s.png' } })).toBe(
      'https://img/s.png',
    )
    expect(avatarUrlOf({ link, versions: { medium: 'https://img/m.png', small: 'x' } })).toBe(
      'https://img/m.png',
    )
  })
})
