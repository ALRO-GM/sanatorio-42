import { afterEach, describe, expect, it } from 'vitest'

import type { PoolNotice, PoolSettings } from '@sanatorio/contracts'
import { sign } from '../../src/modules/auth/signed-cookie.js'
import { json, makeApp } from '../helpers/test-app.js'
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

/** El `SESSION_SECRET` de `makeApp`. */
const SECRET = 'secreto-de-sesion-para-pruebas-de-treinta-y-dos'
const DAY = 86_400_000
const piscine = (days: number) => [
  { cursus_id: 9, begin_at: new Date(Date.now() + days * DAY).toISOString() },
]
const profile = (login: string, cursus: unknown[]) => ({
  id: 7,
  login,
  campus_users: [{ campus_id: 22, is_primary: true }],
  cursus_users: cursus,
  projects_users: [],
})

/** Vuelve de 42 y dice adónde redirige la API. */
async function callback(built: TestApp): Promise<URL> {
  const start = await built.app.inject({ method: 'GET', url: '/auth/login' })
  const cookie = String(start.headers['set-cookie']).split(';')[0] ?? ''
  const state = new URL(String(start.headers.location)).searchParams.get('state') ?? ''
  const back = await built.app.inject({
    method: 'GET',
    url: `/auth/callback?code=codigo&state=${encodeURIComponent(state)}`,
    headers: { cookie },
  })

  expect(back.statusCode).toBe(302)

  return new URL(String(back.headers.location))
}

describe('quién entra', () => {
  it('un piscinero, con la piscina cerrada, vuelve con el aviso y sin sesión', async () => {
    const built = await app({}, { profile: profile('pisci', piscine(-5)) })
    const url = await callback(built)

    expect(url.searchParams.get('error')).toBe('pool_closed')
    expect(url.searchParams.get('status')).toBe('403')
  })

  it('Discovery o una piscina antigua: no es de estudiante', async () => {
    for (const cursus of [[{ cursus_id: 3, begin_at: '2026-10-01T00:00:00Z' }], piscine(-200)]) {
      const built = await app({}, { profile: profile('disco', cursus) })

      expect((await callback(built)).searchParams.get('error')).toBe('not_student')
    }
  })

  it('quien administra entra siempre, aunque no sea estudiante', async () => {
    const built = await app({ ADMIN_LOGINS: 'disco' }, { profile: profile('disco', piscine(-200)) })

    expect((await callback(built)).searchParams.get('error')).toBeNull()
  })

  it('el aviso de la piscina cerrada lo escribe quien administra y se lee sin sesión', async () => {
    const built = await app({ ADMIN_LOGINS: 'albrodri' })
    const admin = await built.adminLogin()
    const saved = await built.app.inject({
      method: 'PUT',
      url: '/admin/pool',
      headers: { cookie: admin, 'content-type': 'application/json' },
      payload: { message: '  La piscina abre el lunes.  ' },
    })

    expect(saved.statusCode).toBe(200)
    expect(json(saved) as PoolSettings).toMatchObject({
      open: false,
      message: 'La piscina abre el lunes.',
    })

    const notice = await built.app.inject({ method: 'GET', url: '/pool/notice' })

    expect(json(notice) as PoolNotice).toEqual({ message: 'La piscina abre el lunes.' })

    const student = await built.login()
    const forbidden = await built.app.inject({
      method: 'PUT',
      url: '/admin/pool',
      headers: { cookie: student, 'content-type': 'application/json' },
      payload: { message: 'x' },
    })

    expect(forbidden.statusCode).toBe(403)
  })

  it('una cookie de antes, sin el grupo, ya no vale; la de ahora, sí', async () => {
    const built = await app()
    const me = (cookie: string) =>
      built.app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } })
    const fresh = await built.login()
    const [name = '', value = ''] = fresh.split('=')
    const payload = JSON.parse(
      Buffer.from(value.split('.')[0] ?? '', 'base64url').toString('utf8'),
    ) as Record<string, unknown>
    const { aud, ...before } = payload
    const old = sign(SECRET, Buffer.from(JSON.stringify(before)).toString('base64url'))

    expect(aud).toBe('student')
    expect((await me(fresh)).statusCode).toBe(200)
    expect((await me(`${name}=${old}`)).statusCode).toBe(401)
  })
})
