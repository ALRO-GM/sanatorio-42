/**
 * La cuenta de staff, de punta a punta: quien administra la crea, el staff entra
 * con su clave, y con esa sesión solo puede validar documentos.
 */

import { afterEach, describe, expect, it } from 'vitest'

import type { StaffAccountCreated, StaffDocument } from '@sanatorio/contracts'
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

const SESSION = '__Host-sanatorio_session'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

function send(built: TestApp, method: Method, url: string, cookie: string | null, body?: unknown) {
  return built.app.inject({
    method,
    url,
    headers: {
      ...(cookie === null ? {} : { cookie }),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { payload: JSON.stringify(body) }),
  })
}

/** App con `albrodri` administrando, una cuenta de staff creada y su sesión abierta. */
async function withStaff() {
  const built = await app({ ADMIN_LOGINS: 'albrodri' })
  const admin = await built.login()
  const created = json(
    await send(built, 'POST', '/admin/staff', admin, { name: 'Bocal Madrid' }),
  ) as StaffAccountCreated
  const entered = await send(built, 'POST', '/auth/staff', null, { key: created.key })
  const staff = cookieValue(entered.headers['set-cookie'], SESSION)

  return { built, admin, created, entered, staff }
}

describe('cuenta de staff', () => {
  it('quien administra la crea, y con la clave se abre una sesión corta y estricta', async () => {
    const { built, created, entered, staff } = await withStaff()
    const cookie = String(entered.headers['set-cookie'])

    expect(entered.statusCode).toBe(204)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Strict')
    expect(cookie).toContain('Max-Age=7200')
    expect(json(await send(built, 'GET', '/staff/me', staff))).toEqual({
      name: created.account.name,
    })
  })

  it('con la sesión de staff no se entra en nada más: ni una sola ruta de la web', async () => {
    const { built, staff } = await withStaff()
    const opened: string[] = []

    for (const { method, url } of built.routes) {
      if (
        method === 'OPTIONS' ||
        url.startsWith('/staff/') ||
        url.startsWith('/health') ||
        ['/auth/login', '/auth/callback', '/auth/logout', '/auth/staff'].includes(url)
      ) {
        continue
      }

      const response = await send(
        built,
        method as Method,
        url.replace(/:[a-zA-Z]+/g, '1'),
        staff,
        method === 'POST' || method === 'PUT' ? {} : undefined,
      )

      if (response.statusCode !== 401 && response.statusCode !== 403) {
        opened.push(`${method} ${url} → ${response.statusCode}`)
      }
    }

    expect(opened).toEqual([])
  })

  it('para la web de la gente, una sesión de staff es como no haber entrado', async () => {
    const { built, staff } = await withStaff()

    expect((await send(built, 'GET', '/auth/me', staff)).statusCode).toBe(401)
    expect((await send(built, 'GET', '/me/profile', staff)).statusCode).toBe(403)
    expect((await send(built, 'GET', '/admin/people', staff)).statusCode).toBe(403)
    expect((await send(built, 'GET', '/admin/staff', staff)).statusCode).toBe(403)
    expect((await send(built, 'POST', '/admin/staff', staff, { name: 'Otra' })).statusCode).toBe(
      403,
    )
  })

  it('una sesión de una persona, aunque administre, no sirve en las rutas de staff', async () => {
    const { built, admin } = await withStaff()

    expect((await send(built, 'GET', '/staff/me', admin)).statusCode).toBe(403)
    expect((await send(built, 'GET', '/staff/documents/AAAA', admin)).statusCode).toBe(403)
    expect(
      (await send(built, 'POST', '/staff/documents/AAAA/compare', admin, { content: '' }))
        .statusCode,
    ).toBe(403)
    expect((await send(built, 'GET', '/staff/me', null)).statusCode).toBe(401)
  })

  it('quien no administra no crea, ni ve, ni retira cuentas de staff', async () => {
    const built = await app()
    const cookie = await built.login()

    expect((await send(built, 'GET', '/admin/staff', cookie)).statusCode).toBe(403)
    expect((await send(built, 'POST', '/admin/staff', cookie, { name: 'Bocal' })).statusCode).toBe(
      403,
    )
    expect((await send(built, 'DELETE', '/admin/staff/1', cookie)).statusCode).toBe(403)
  })

  it('una clave mala da siempre la misma respuesta, y a la undécima hay que esperar', async () => {
    const { built, created } = await withStaff()
    const statuses: number[] = []
    const bodies = new Set<string>()

    for (const key of [
      'nada',
      '',
      `${created.key}x`,
      's42-9999-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      null,
      42,
      { a: 1 },
      'x'.repeat(5000),
      created.key.slice(0, -2),
      created.key.toUpperCase(),
    ]) {
      const response = await send(built, 'POST', '/auth/staff', null, { key })

      statuses.push(response.statusCode)
      bodies.add(response.body)
      expect(response.headers['set-cookie']).toBeUndefined()
    }

    expect(statuses).toEqual(Array.from({ length: 10 }, () => 401))
    expect(bodies.size).toBe(1)

    // Agotados los intentos, ni la clave buena entra hasta que pase el rato.
    const blocked = await send(built, 'POST', '/auth/staff', null, { key: created.key })

    expect(blocked.statusCode).toBe(429)
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0)
    expect(blocked.headers['set-cookie']).toBeUndefined()
  })

  it('sin cuerpo, o con otra cosa, la entrada de staff no rompe nada', async () => {
    const built = await app()

    expect((await send(built, 'POST', '/auth/staff', null)).statusCode).toBe(401)
    expect((await send(built, 'POST', '/auth/staff', null, [])).statusCode).toBe(401)
    expect((await send(built, 'POST', '/auth/staff', null, 'texto')).statusCode).toBe(401)
  })

  it('al retirar la cuenta, la sesión que ya estaba abierta deja de valer', async () => {
    const { built, admin, created, staff } = await withStaff()

    expect(
      (await send(built, 'DELETE', `/admin/staff/${created.account.id}`, admin)).statusCode,
    ).toBe(204)
    expect((await send(built, 'GET', '/staff/me', staff)).statusCode).toBe(401)
    expect((await send(built, 'GET', '/staff/documents/AAAA', staff)).statusCode).toBe(401)
    expect((await send(built, 'POST', '/auth/staff', null, { key: created.key })).statusCode).toBe(
      401,
    )
    expect(
      (await send(built, 'DELETE', `/admin/staff/${created.account.id}`, admin)).statusCode,
    ).toBe(404)
  })

  it('una cookie de staff retocada no vale', async () => {
    const { built, staff } = await withStaff()
    const [name, value = ''] = staff.split('=')
    const [payload = '', signature = ''] = value.split('.')
    const forged = Buffer.from(
      JSON.stringify({
        ...(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as object),
        role: 'student',
        login: 'albrodri',
      }),
    ).toString('base64url')

    expect(
      (await send(built, 'GET', '/staff/me', `${name}=${forged}.${signature}`)).statusCode,
    ).toBe(401)
    expect(
      (await send(built, 'GET', '/admin/people', `${name}=${forged}.${signature}`)).statusCode,
    ).toBe(401)
  })
})

describe('el documento, de la descarga a la comprobación', () => {
  it('el CSV sale con el código en el nombre y el staff lo encuentra con él', async () => {
    const { built, admin, staff } = await withStaff()
    const download = await send(
      built,
      'GET',
      '/events/report?format=csv&from=2026-09-01&to=2026-09-30',
      admin,
    )
    const code = String(download.headers['x-verification-code'])

    expect(download.statusCode).toBe(200)
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{4}$/)
    expect(download.headers['content-disposition']).toBe(
      `attachment; filename="horas-validadas_albrodri_2026-09-01_2026-09-30_${code}.csv"`,
    )
    expect(download.headers['cache-control']).toBe('private, no-store')
    expect(download.body.endsWith(`"codigo_de_verificacion";"${code}"\r\n`)).toBe(true)

    const found = json(
      await send(built, 'GET', `/staff/documents/${code.toLowerCase()}`, staff),
    ) as StaffDocument

    expect(found).toMatchObject({
      code,
      login: 'albrodri',
      requestedBy: 'albrodri',
      from: '2026-09-01',
      to: '2026-09-30',
      totalMinutes: 0,
      rows: 0,
      lines: [],
    })
    expect(found.header).toContain('minutos_validados')
  })

  it('el fichero tal cual es idéntico; con una cifra cambiada, no', async () => {
    const { built, admin, staff } = await withStaff()
    const download = await send(built, 'GET', '/events/report?format=csv', admin)
    const code = String(download.headers['x-verification-code'])
    const same = await send(built, 'POST', `/staff/documents/${code}/compare`, staff, {
      content: download.body,
    })
    const tampered = await send(built, 'POST', `/staff/documents/${code}/compare`, staff, {
      content: `${download.body}"albrodri";"organiza";"pizarra";"board:1";"x";"2026-09-01";"10:00";"18:00";"480";"480";""\r\n`,
    })

    expect(json(same)).toEqual({ identical: true })
    expect(json(tampered)).toEqual({ identical: false })
  })

  it('descargar dos veces lo mismo da el mismo código', async () => {
    const { built, admin } = await withStaff()
    const first = await send(
      built,
      'GET',
      '/events/report?format=csv&from=2026-09-01&to=2026-09-30',
      admin,
    )
    const second = await send(
      built,
      'GET',
      '/events/report?format=csv&from=2026-09-01&to=2026-09-30',
      admin,
    )
    const other = await send(
      built,
      'GET',
      '/events/report?format=csv&from=2026-09-02&to=2026-09-30',
      admin,
    )

    expect(second.headers['x-verification-code']).toBe(first.headers['x-verification-code'])
    expect(other.headers['x-verification-code']).not.toBe(first.headers['x-verification-code'])
  })

  it('códigos imposibles en la dirección: 404, nunca un error interno', async () => {
    const { built, staff } = await withStaff()

    for (const code of ['ZZZZ', '0000', 'a', '%27%20OR%201', '..%2F..%2Fadmin', 'A'.repeat(100)]) {
      const response = await send(built, 'GET', `/staff/documents/${code}`, staff)

      expect(response.statusCode, code.slice(0, 20)).toBe(404)
    }

    // Y uno desmesurado ni llega a la ruta: el servidor lo corta por largo.
    expect(
      (await send(built, 'GET', `/staff/documents/${'A'.repeat(3000)}`, staff)).statusCode,
    ).toBe(414)
  })

  it('un fichero enorme para comparar se rechaza sin tumbar nada', async () => {
    const { built, admin, staff } = await withStaff()
    const download = await send(built, 'GET', '/events/report?format=csv', admin)
    const code = String(download.headers['x-verification-code'])
    const big = await send(built, 'POST', `/staff/documents/${code}/compare`, staff, {
      content: 'x'.repeat(1_000_001),
    })
    const enormous = await send(built, 'POST', `/staff/documents/${code}/compare`, staff, {
      content: 'x'.repeat(5_000_000),
    })

    expect(big.statusCode).toBe(400)
    expect(enormous.statusCode).toBe(413)
  })

  it('el informe de otra persona sigue siendo solo de quien administra', async () => {
    const built = await app()
    const cookie = await built.login()

    expect(
      (await send(built, 'GET', '/events/report?format=csv&login=all', cookie)).statusCode,
    ).toBe(403)
    expect(
      (await send(built, 'GET', '/events/report?format=csv&login=jdoe', cookie)).statusCode,
    ).toBe(403)
    expect((await send(built, 'GET', '/events/report?format=csv', cookie)).statusCode).toBe(200)
  })
})
