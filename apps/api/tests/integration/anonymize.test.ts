/**
 * Anonimizar la cuenta (M7): hay que escribir el login, cambia en todas las
 * tablas de la app, cierra la sesión, y la de otra persona solo la hace quien
 * administra.
 */

import { afterEach, describe, expect, it } from 'vitest'

import { makeApp } from '../helpers/test-app.js'
import type { TestApp } from '../helpers/test-app.js'

let built: TestApp | undefined

afterEach(async () => {
  await built?.close()
  built = undefined
})

describe('anonimizar la cuenta', () => {
  it('con el login escrito, lo tuyo pasa a un identificador opaco y se cierra la sesión', async () => {
    built = await makeApp({ ADMIN_LOGINS: 'otra' })
    const app = built
    const cookie = await app.login()
    const post = (url: string, body: unknown, who: string | null = cookie) =>
      app.app.inject({
        method: 'POST',
        url,
        headers: { 'content-type': 'application/json', ...(who === null ? {} : { cookie: who }) },
        payload: JSON.stringify(body),
      })

    // Algo suyo en la app: guardia y condiciones aceptadas.
    await app.app.inject({
      method: 'PUT',
      url: '/me/availability',
      headers: { cookie, 'content-type': 'application/json' },
      payload: JSON.stringify({ available: true }),
    })
    const before = await app.app.inject({ method: 'GET', url: '/me/export', headers: { cookie } })
    const { login } = JSON.parse(before.body) as { login: string }

    expect((await post('/me/anonymize', { confirm: 'otro' })).statusCode).toBe(400)
    expect((await post('/me/anonymize', { confirm: login }, null)).statusCode).toBe(401)

    const done = await post('/me/anonymize', { confirm: login.toUpperCase() })

    expect(done.statusCode).toBe(200)
    expect((JSON.parse(done.body) as { changed: number }).changed).toBeGreaterThan(0)
    expect(String(done.headers['set-cookie'])).toMatch(/Max-Age=0/)

    // Sin rastro de su login en lo de la app.
    expect(
      (await app.db.execute({ sql: 'SELECT 1 FROM availability WHERE login = ?', args: [login] }))
        .rows,
    ).toHaveLength(0)
    expect(
      (await app.db.execute("SELECT login FROM availability WHERE login LIKE 'anon-%'")).rows,
    ).toHaveLength(1)
  })

  it('la de otra persona, solo quien administra', async () => {
    built = await makeApp()
    const cookie = await built.login()
    const asked = await built.app.inject({
      method: 'POST',
      url: '/admin/people/jdoe/anonymize',
      headers: { cookie },
    })

    expect(asked.statusCode).toBe(403)
  })

  it('quien administra puede hacerlo por quien lo pidió por otra vía', async () => {
    built = await makeApp({ ADMIN_LOGINS: 'albrodri' })
    const cookie = await built.adminLogin()
    const asked = await built.app.inject({
      method: 'POST',
      url: '/admin/people/jdoe/anonymize',
      headers: { cookie },
    })

    expect(asked.statusCode).toBe(200)
    expect(
      (
        await built.app.inject({
          method: 'POST',
          url: '/admin/people/..%2Fx/anonymize',
          headers: { cookie },
        })
      ).statusCode,
    ).toBe(400)
  })
})
