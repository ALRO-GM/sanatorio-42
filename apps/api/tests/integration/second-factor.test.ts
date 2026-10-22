/**
 * El segundo factor del panel, de punta a punta: entrar con 42 y administrar ya
 * no basta; hace falta el código de la app de autenticación, cada 12 horas y en
 * cada navegador.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { base32Decode, codeAt, stepOf } from '../../src/modules/admin/totp.js'
import { cookieValue, json, makeApp } from '../helpers/test-app.js'
import type { TestApp } from '../helpers/test-app.js'

const apps: TestApp[] = []
const PANEL = '__Host-sanatorio_admin'

async function app(...args: Parameters<typeof makeApp>): Promise<TestApp> {
  const built = await makeApp(...args)
  apps.push(built)
  return built
}

afterEach(async () => {
  vi.useRealTimers()
  for (const built of apps.splice(0)) await built.close()
})

function send(built: TestApp, method: 'GET' | 'POST', url: string, cookie: string, body?: unknown) {
  return built.app.inject({
    method,
    url,
    headers: {
      cookie,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { payload: JSON.stringify(body) }),
  })
}

/** Da de alta y devuelve el secreto, como lo leería la app del móvil del QR. */
async function enroll(built: TestApp, session: string): Promise<Uint8Array> {
  const setup = await send(built, 'POST', '/admin/totp/setup', session)
  const uri = (json(setup) as { uri: string }).uri

  expect(uri.startsWith('otpauth://totp/')).toBe(true)

  return base32Decode(new URL(uri).searchParams.get('secret') ?? '') ?? new Uint8Array()
}

describe('segundo factor del panel', () => {
  it('sin el código, quien administra no entra en el panel; con él, sí', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-16T10:00:00Z'))

    const built = await app({ ADMIN_LOGINS: 'albrodri' })
    const session = await built.login()

    // Todo /admin cerrado, menos lo del propio segundo factor.
    const closed = await send(built, 'GET', '/admin/people', session)

    expect(closed.statusCode).toBe(403)
    expect(json(closed)).toMatchObject({ error: 'second_factor' })
    // Codificar una letra de la ruta no la saca de /admin: el enrutador la
    // descodifica y sirve la misma ruta, así que la cerradura también.
    const encoded = await send(built, 'GET', '/%61dmin/people', session)

    expect(encoded.statusCode).toBe(403)
    expect(json(encoded)).toMatchObject({ error: 'second_factor' })
    expect(json(await send(built, 'GET', '/admin/totp', session))).toEqual({
      enrolled: false,
      elevatedUntil: null,
    })
    // Sin alta no hay nada que verificar.
    expect(
      (await send(built, 'POST', '/admin/totp/verify', session, { code: '123456' })).statusCode,
    ).toBe(409)

    const secret = await enroll(built, session)
    // Un código equivocado no confirma el alta.
    const wrong = String((Number(codeAt(secret, stepOf(Date.now()))) + 1) % 1_000_000).padStart(
      6,
      '0',
    )

    expect(
      (await send(built, 'POST', '/admin/totp/confirm', session, { code: wrong })).statusCode,
    ).toBe(400)

    const confirmed = await send(built, 'POST', '/admin/totp/confirm', session, {
      code: codeAt(secret, stepOf(Date.now())),
    })

    expect(confirmed.statusCode).toBe(204)

    const setCookie = String(confirmed.headers['set-cookie'])

    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('Secure')
    expect(setCookie).toContain('SameSite=Strict')
    expect(setCookie).toContain(`Max-Age=${12 * 60 * 60}`)

    const panel = `${session}; ${cookieValue(confirmed.headers['set-cookie'], PANEL)}`

    expect((await send(built, 'GET', '/admin/people', panel)).statusCode).toBe(200)
    expect(json(await send(built, 'GET', '/admin/totp', panel))).toEqual({
      enrolled: true,
      elevatedUntil: '2026-10-16T22:00:00.000Z',
    })
    // Ya dado de alta, no se genera otro secreto (sería una puerta trasera).
    expect((await send(built, 'POST', '/admin/totp/setup', panel)).statusCode).toBe(409)

    // A las 12 horas se cierra solo, aunque la sesión de 42 siga (se vuelve a
    // entrar por si esa ya caducó); se abre otra vez con un código nuevo.
    vi.setSystemTime(new Date('2026-10-16T22:00:01Z'))

    const later = await built.login()
    const stale = `${later}; ${panel.split('; ')[1] ?? ''}`

    expect((await send(built, 'GET', '/admin/people', stale)).statusCode).toBe(403)

    const again = await send(built, 'POST', '/admin/totp/verify', later, {
      code: codeAt(secret, stepOf(Date.now())),
    })

    expect(again.statusCode).toBe(204)
    expect(
      (
        await send(
          built,
          'GET',
          '/admin/people',
          `${later}; ${cookieValue(again.headers['set-cookie'], PANEL)}`,
        )
      ).statusCode,
    ).toBe(200)
  })

  it('un código usado no vale otra vez, y al sexto fallo hay que esperar', async () => {
    const built = await app({ ADMIN_LOGINS: 'albrodri' })
    const session = await built.login()
    const secret = await enroll(built, session)
    const code = codeAt(secret, stepOf(Date.now()))

    expect((await send(built, 'POST', '/admin/totp/confirm', session, { code })).statusCode).toBe(
      204,
    )
    expect((await send(built, 'POST', '/admin/totp/verify', session, { code })).statusCode).toBe(
      400,
    )

    for (let attempt = 1; attempt < 5; attempt += 1) {
      expect(
        (await send(built, 'POST', '/admin/totp/verify', session, { code: '000000' })).statusCode,
      ).toBe(400)
    }
    // Cinco fallos: ni el bueno pasa hasta que pase el cuarto de hora.
    const blocked = await send(built, 'POST', '/admin/totp/verify', session, {
      code: codeAt(secret, stepOf(Date.now()) + 1),
    })

    expect(blocked.statusCode).toBe(429)
  })

  it('la cookie del panel es de esa persona: retocada o ajena, no vale', async () => {
    const built = await app({ ADMIN_LOGINS: 'albrodri,jdoe' })
    const session = await built.adminLogin()
    const [mine = '', panel = ''] = session.split('; ')
    const value = panel.slice(`${PANEL}=`.length)
    const [login = '', until = '', signature = ''] = value.split('.')

    // Más tiempo, otra persona, otra firma o nada de firma: todo fuera.
    for (const forged of [
      `${login}.${Number(until) + 3_600_000}.${signature}`,
      `jdoe.${until}.${signature}`,
      `${login}.${until}.${signature.slice(1)}x`,
      `${login}.${until}`,
      '',
      'basura',
    ]) {
      expect(
        (await send(built, 'GET', '/admin/people', `${mine}; ${PANEL}=${forged}`)).statusCode,
        forged,
      ).toBe(403)
    }
    expect((await send(built, 'GET', '/admin/people', session)).statusCode).toBe(200)

    // Cerrar el panel borra la cookie.
    const lock = await send(built, 'POST', '/admin/totp/lock', session)

    expect(lock.statusCode).toBe(204)
    expect(String(lock.headers['set-cookie'])).toContain('Max-Age=0')
  })

  it('quien no administra no llega ni al segundo factor', async () => {
    const built = await app()
    const session = await built.login()

    for (const url of ['/admin/totp', '/admin/totp/setup']) {
      expect(
        (await send(built, url.endsWith('setup') ? 'POST' : 'GET', url, session)).statusCode,
      ).toBe(403)
    }
  })
})
