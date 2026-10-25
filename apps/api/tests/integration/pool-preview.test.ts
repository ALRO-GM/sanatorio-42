import { afterEach, describe, expect, it } from 'vitest'

import type { PoolAccess } from '@sanatorio/contracts'
import { sign } from '../../src/modules/auth/signed-cookie.js'
import { json, makeApp } from '../helpers/test-app.js'
import type { TestApp } from '../helpers/test-app.js'

/**
 * La vista de piscinero de quien administra (`docs/piscineros.md`): entrar,
 * que todo le trate como a un piscinero (también el corte de `/admin/`), salir,
 * y que un piscinero de verdad no pueda usar la salida para hacerse estudiante.
 */

const apps: TestApp[] = []

afterEach(async () => {
  for (const built of apps.splice(0)) await built.close()
})

/** El `SESSION_SECRET` de `makeApp`. */
const SECRET = 'secreto-de-sesion-para-pruebas-de-treinta-y-dos'
const SESSION = '__Host-sanatorio_session'
const DAY = 86_400_000
const PISCI = {
  id: 7,
  login: 'pisci',
  campus_users: [{ campus_id: 22, is_primary: true }],
  cursus_users: [{ cursus_id: 9, begin_at: new Date(Date.now() - 5 * DAY).toISOString() }],
  projects_users: [],
}

async function app(...args: Parameters<typeof makeApp>): Promise<TestApp> {
  const built = await makeApp(...args)

  apps.push(built)

  return built
}

const send = (built: TestApp, method: 'GET' | 'POST' | 'PUT', url: string, cookie: string) =>
  built.app.inject({ method, url, headers: { cookie } })

/** Las cookies con la de sesión cambiada por la que devuelve la respuesta. */
function withSession(cookie: string, response: { headers: Record<string, unknown> }): string {
  const fresh = String(response.headers['set-cookie']).split(';')[0] ?? ''

  expect(fresh.startsWith(`${SESSION}=`)).toBe(true)

  return cookie
    .split('; ')
    .map((part) => (part.startsWith(`${SESSION}=`) ? fresh : part))
    .join('; ')
}

/** Lo que va firmado dentro de la cookie de sesión. */
function payloadOf(cookie: string): Record<string, unknown> {
  const value = cookie.split('; ').find((part) => part.startsWith(`${SESSION}=`)) ?? ''
  const raw = value.slice(SESSION.length + 1).split('.')[0] ?? ''

  return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Record<string, unknown>
}

describe('la vista de piscinero de quien administra', () => {
  it('entra con la piscina cerrada, es piscinero a todos los efectos y vuelve', async () => {
    const built = await app({ ADMIN_LOGINS: 'albrodri' })
    const admin = await built.adminLogin()
    const entered = await send(built, 'POST', '/admin/pool/preview', admin)

    expect(entered.statusCode).toBe(204)

    const preview = withSession(admin, entered)

    // Firmado como piscinero, con la marca y la misma caducidad.
    expect(payloadOf(preview)).toMatchObject({ aud: 'pool', preview: true })
    expect(payloadOf(preview).exp).toBe(payloadOf(admin).exp)

    const access = json(await send(built, 'GET', '/pool/access', preview)) as PoolAccess

    expect(access).toMatchObject({ pool: true, preview: true })
    expect(access.allow).toContain('expediente')

    // El corte de piscineros: lo no permitido (y todo el panel) da 403.
    expect((await send(built, 'GET', '/admin/pool', preview)).statusCode).toBe(403)
    expect((await send(built, 'POST', '/admin/pool/preview', preview)).statusCode).toBe(403)
    expect((await send(built, 'GET', '/leaderboard', preview)).statusCode).toBe(403)
    expect((await send(built, 'GET', '/me/legal', preview)).statusCode).toBe(200)

    // Y no administra: su expediente lo dice como el de cualquier piscinero.
    const profile = json(await send(built, 'GET', '/me/profile', preview)) as { admin: boolean }

    expect(profile.admin).toBe(false)

    const left = await send(built, 'POST', '/pool/preview/exit', preview)

    expect(left.statusCode).toBe(204)

    const back = withSession(preview, left)

    expect(payloadOf(back)).toMatchObject({ aud: 'student', role: 'student' })
    expect(payloadOf(back)).not.toHaveProperty('preview')
    expect(payloadOf(back).exp).toBe(payloadOf(admin).exp)
    expect((json(await send(built, 'GET', '/pool/access', back)) as PoolAccess).pool).toBe(false)
    expect((await send(built, 'GET', '/admin/pool', back)).statusCode).toBe(200)

    // Ya fuera, salir otra vez no hace nada.
    expect((await send(built, 'POST', '/pool/preview/exit', back)).statusCode).toBe(403)
  })

  it('quien no administra no entra, y sin sesión es 401', async () => {
    const built = await app()
    const student = await built.login()

    expect((await send(built, 'POST', '/admin/pool/preview', student)).statusCode).toBe(403)
    expect((await send(built, 'POST', '/pool/preview/exit', student)).statusCode).toBe(403)
    expect(
      (await built.app.inject({ method: 'POST', url: '/admin/pool/preview' })).statusCode,
    ).toBe(401)
  })

  it('un piscinero de verdad no puede usar la salida para hacerse estudiante', async () => {
    const built = await app({}, { profile: PISCI })

    await built.db.execute({
      sql: `INSERT INTO settings (key, value, updated_by, updated_at) VALUES ('pool', ?, 'test', ?)`,
      args: [
        JSON.stringify({ open: true, message: '', allow: ['expediente'] }),
        new Date().toISOString(),
      ],
    })

    const pisci = await built.login()

    expect((await send(built, 'POST', '/pool/preview/exit', pisci)).statusCode).toBe(403)
    expect((await send(built, 'POST', '/admin/pool/preview', pisci)).statusCode).toBe(403)
    expect((json(await send(built, 'GET', '/pool/access', pisci)) as PoolAccess).preview).toBe(
      undefined,
    )

    // La marca va firmada: añadírsela a mano rompe la firma y no hay sesión.
    const [, value = ''] = pisci.split('=')
    const forged = Buffer.from(JSON.stringify({ ...payloadOf(pisci), preview: true })).toString(
      'base64url',
    )
    const tampered = `${SESSION}=${forged}.${value.split('.')[1] ?? ''}`

    expect((await send(built, 'POST', '/pool/preview/exit', tampered)).statusCode).toBe(401)

    // Y aunque alguien la firmara, sin administrar no sale.
    const signed = `${SESSION}=${sign(SECRET, forged)}`

    expect((await send(built, 'POST', '/pool/preview/exit', signed)).statusCode).toBe(403)
  })
})
