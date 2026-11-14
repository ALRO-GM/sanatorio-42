/**
 * El historial del black hole (#81), de punta a punta: desde el 2026-11-14
 * (decidido por Alberto) lo ve cualquiera con sesión en `GET /exams/blackhole`,
 * no solo quien administra. Sin sesión no se entra; con una de staff, tampoco;
 * y la ruta vieja de `/admin/` ya no existe (no hay dos).
 */

import { afterEach, describe, expect, it } from 'vitest'

import type { StaffAccountCreated } from '@sanatorio/contracts'
import { cookieValue, json, makeApp } from '../helpers/test-app.js'
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

function get(built: TestApp, url: string, cookie: string | null) {
  return built.app.inject({ method: 'GET', url, headers: cookie === null ? {} : { cookie } })
}

describe('GET /exams/blackhole', () => {
  it('sin sesión, 401; con la de un estudiante que no administra, 200', async () => {
    // Nadie administra: `albrodri` entra como estudiante sin más.
    const built = await app({ ADMIN_LOGINS: '' })
    const student = await built.login()

    expect((await get(built, '/exams/blackhole', null)).statusCode).toBe(401)

    const response = await get(built, '/exams/blackhole?track=classic&kickoffs=2025-10', student)

    expect(response.statusCode).toBe(200)
    expect(json(response)).toEqual({ absorbed: [], closest: [] })
  })

  it('lo que no es un plan o un mes, 400; y la ruta de /admin/ ya no está', async () => {
    const built = await app({ ADMIN_LOGINS: 'albrodri' })
    const admin = await built.adminLogin()

    for (const query of ['track=pascal', 'kickoffs=2026-13', "kickoffs=2026-01'%20OR%201=1"]) {
      expect((await get(built, `/exams/blackhole?${query}`, admin)).statusCode).toBe(400)
    }
    expect((await get(built, '/admin/exams/blackhole', admin)).statusCode).toBe(404)
  })

  it('una sesión de staff no entra', async () => {
    const built = await app({ ADMIN_LOGINS: 'albrodri' })
    const admin = await built.adminLogin()
    const created = json(
      await built.app.inject({
        method: 'POST',
        url: '/admin/staff',
        headers: { cookie: admin, 'content-type': 'application/json' },
        payload: { name: 'Bocal Madrid' },
      }),
    ) as StaffAccountCreated
    const entered = await built.app.inject({
      method: 'POST',
      url: '/auth/staff',
      headers: { 'content-type': 'application/json' },
      payload: { key: created.key },
    })
    const staff = cookieValue(entered.headers['set-cookie'], '__Host-sanatorio_session')

    expect([401, 403]).toContain((await get(built, '/exams/blackhole', staff)).statusCode)
  })
})
