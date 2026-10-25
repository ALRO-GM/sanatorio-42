/**
 * Modo mantenimiento (`docs/mantenimiento.md`) por HTTP: quien administra lo
 * pone y sigue usando la web; al resto la API le contesta `503` con
 * `error: 'maintenance'`, salvo la salud, la sesión y el propio estado. Y los
 * avisos con cuenta atrás de punta a punta, también para un piscinero.
 */

import { afterEach, describe, expect, it } from 'vitest'

import type { Countdown, MaintenanceStatus, Pulse } from '@sanatorio/contracts'
import { sign } from '../../src/modules/auth/signed-cookie.js'
import { userId } from '../helpers/fixtures.js'
import { json, makeApp } from '../helpers/test-app.js'
import type { TestApp } from '../helpers/test-app.js'

const apps: TestApp[] = []

afterEach(async () => {
  for (const built of apps.splice(0)) await built.close()
})

/** El `SESSION_SECRET` de `makeApp`. */
const SECRET = 'secreto-de-sesion-para-pruebas-de-treinta-y-dos'
const HOUR = 3_600_000
const inHours = (hours: number): string => new Date(Date.now() + hours * HOUR).toISOString()

/** Una cookie de sesión como la de `base`, pero de otra persona y grupo. */
function cookieAs(base: string, login: string, aud: 'student' | 'pool'): string {
  const [name = '', value = ''] = base.split('=')
  const payload = JSON.parse(
    Buffer.from(value.split('.')[0] ?? '', 'base64url').toString('utf8'),
  ) as Record<string, unknown>
  const next = { ...payload, id: userId(login), login, role: aud, aud, campusId: 22 }

  return `${name}=${sign(SECRET, Buffer.from(JSON.stringify(next)).toString('base64url'))}`
}

type Call = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  url: string
  cookie?: string
  body?: unknown
}

const call = (built: TestApp, { method = 'GET', url, cookie, body }: Call) =>
  built.app.inject({
    method,
    url,
    headers: {
      ...(cookie === undefined ? {} : { cookie }),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { payload: body as Record<string, unknown> }),
  })

async function world(): Promise<{ built: TestApp; admin: string; student: string; pool: string }> {
  const built = await makeApp({ ADMIN_LOGINS: 'albrodri' })

  apps.push(built)
  // La piscina abierta, con lo justo: sin calendario (no puede fijarse nada).
  await built.db.execute({
    sql: `INSERT INTO settings (key, value, updated_by, updated_at) VALUES ('pool', ?, 'test', ?)`,
    args: [JSON.stringify({ open: true, message: '', allow: ['expediente'] }), inHours(0)],
  })

  const admin = await built.adminLogin()
  const session = admin.split('; ')[0] ?? ''

  return {
    built,
    admin,
    student: cookieAs(session, 'mgomez', 'student'),
    pool: cookieAs(session, 'pisci', 'pool'),
  }
}

describe('modo mantenimiento', () => {
  it('cierra la web a quien no administra y la abre al quitarlo', async () => {
    const { built, admin, student, pool } = await world()

    expect(json(await call(built, { url: '/maintenance', cookie: student }))).toEqual({
      on: false,
      message: null,
      until: null,
      since: null,
      exempt: false,
    })

    const until = inHours(2)
    const put = await call(built, {
      method: 'PUT',
      url: '/admin/maintenance',
      cookie: admin,
      body: { on: true, message: '  Actualizamos la base  ', until },
    })

    expect(put.statusCode).toBe(200)
    expect(json(put)).toMatchObject({ on: true, message: 'Actualizamos la base', until })

    // Quien no administra: 503 con la marca que reconoce la web, con o sin sesión.
    for (const cookie of [student, pool, undefined]) {
      const blocked = await call(built, {
        url: '/me/legal',
        ...(cookie === undefined ? {} : { cookie }),
      })

      expect(blocked.statusCode).toBe(503)
      expect(json(blocked)).toMatchObject({ error: 'maintenance', until })
      expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(3600)
    }

    // Lo que sigue abierto: salud, sesión, el estado y la propia web.
    expect((await call(built, { url: '/health' })).statusCode).toBe(200)
    expect((await call(built, { url: '/auth/me', cookie: student })).statusCode).toBe(200)
    expect((await call(built, { url: '/auth/login' })).statusCode).toBe(302)
    expect((await call(built, { url: '/no-existe' })).statusCode).toBe(404)
    expect(json(await call(built, { url: '/maintenance', cookie: pool }))).toMatchObject({
      on: true,
      exempt: false,
    })

    // Quien administra sigue como siempre, y el pulso le recuerda que está puesto.
    expect(json(await call(built, { url: '/maintenance', cookie: admin }))).toMatchObject({
      exempt: true,
    })
    expect((await call(built, { url: '/me/legal', cookie: admin })).statusCode).toBe(200)
    expect((json(await call(built, { url: '/pulse', cookie: admin })) as Pulse).maintenance).toBe(
      true,
    )

    // Cambiar el mensaje no lo vuelve a empezar.
    const since = (json(await call(built, { url: '/maintenance' })) as MaintenanceStatus).since
    const changed = await call(built, {
      method: 'PUT',
      url: '/admin/maintenance',
      cookie: admin,
      body: { on: true },
    })

    expect(json(changed)).toMatchObject({ since, until: null, message: null })

    await call(built, {
      method: 'PUT',
      url: '/admin/maintenance',
      cookie: admin,
      body: { on: false },
    })
    expect((await call(built, { url: '/me/legal', cookie: student })).statusCode).toBe(200)
    expect((json(await call(built, { url: '/pulse', cookie: student })) as Pulse).maintenance).toBe(
      false,
    )
  })

  it('solo lo pone quien administra, y con datos que valen', async () => {
    const { built, admin, student } = await world()

    expect(
      (
        await call(built, {
          method: 'PUT',
          url: '/admin/maintenance',
          cookie: student,
          body: { on: true },
        })
      ).statusCode,
    ).toBe(403)

    for (const wrong of [
      {},
      { on: 'sí' },
      { on: true, until: 'luego' },
      { on: true, until: inHours(-1) },
      { on: true, until: inHours(24 * 8) },
      { on: true, message: 'x'.repeat(501) },
    ]) {
      const response = await call(built, {
        method: 'PUT',
        url: '/admin/maintenance',
        cookie: admin,
        body: wrong,
      })

      expect(response.statusCode, JSON.stringify(wrong)).toBe(400)
    }

    // Lo de antes sigue: la web, abierta.
    expect((await call(built, { url: '/me/legal', cookie: student })).statusCode).toBe(200)
  })
})

describe('avisos con cuenta atrás por HTTP', () => {
  it('quien administra manda la limpieza de taquillas; le llega también a la piscina y cada cual la cierra', async () => {
    const { built, admin, student, pool } = await world()
    const sent = await call(built, {
      method: 'POST',
      url: '/admin/countdowns',
      cookie: admin,
      body: { preset: 'lockers', at: inHours(72), group: 'all' },
    })

    expect(sent.statusCode).toBe(201)

    const id = (json(sent) as Countdown).id

    for (const cookie of [student, pool]) {
      expect(json(await call(built, { url: '/countdowns', cookie }))).toEqual([
        expect.objectContaining({ id, kind: 'notice', preset: 'lockers' }),
      ])
      expect(
        (json(await call(built, { url: '/pulse', cookie })) as Pulse).countdowns,
      ).toBeGreaterThan(0)
    }

    const dismissed = await call(built, {
      method: 'POST',
      url: `/countdowns/notices/${id}/dismiss`,
      cookie: pool,
    })

    expect(dismissed.statusCode).toBe(200)
    expect(json(dismissed)).toEqual([])
    expect((json(await call(built, { url: '/pulse', cookie: pool })) as Pulse).countdowns).toBe(0)
    expect(json(await call(built, { url: '/countdowns', cookie: student }))).toHaveLength(1)

    // Fijarse algo sale del calendario: un piscinero sin él no puede.
    const mine = await call(built, {
      method: 'POST',
      url: '/countdowns/pins',
      cookie: student,
      body: { kind: 'custom', title: 'Entrega', at: inHours(5) },
    })

    expect(mine.statusCode).toBe(201)
    expect(json(mine)).toHaveLength(2)
    expect(
      (
        await call(built, {
          method: 'POST',
          url: '/countdowns/pins',
          cookie: pool,
          body: { kind: 'next' },
        })
      ).statusCode,
    ).toBe(403)

    // Los de quien administra, solo para quien administra.
    expect((await call(built, { url: '/admin/countdowns', cookie: student })).statusCode).toBe(403)
    expect(json(await call(built, { url: '/admin/countdowns', cookie: admin }))).toEqual([
      expect.objectContaining({ id, dismissed: 1 }),
    ])
    expect(
      (await call(built, { method: 'DELETE', url: `/admin/countdowns/${id}`, cookie: admin }))
        .statusCode,
    ).toBe(204)
    expect(json(await call(built, { url: '/countdowns', cookie: student }))).toEqual([
      expect.objectContaining({ kind: 'custom', title: 'Entrega' }),
    ])
  })
})
