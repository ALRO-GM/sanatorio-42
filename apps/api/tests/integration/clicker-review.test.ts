/**
 * La revisión de trampas de Code Clicker vista por HTTP: el pulso la cuenta (es
 * lo que abre la ventana que no se salta) y deja de contarla al contestar.
 */

import { afterEach, describe, expect, it } from 'vitest'

import { json, makeApp } from '../helpers/test-app.js'
import type { TestApp } from '../helpers/test-app.js'

const apps: TestApp[] = []

afterEach(async () => {
  for (const built of apps.splice(0)) await built.close()
})

function send(built: TestApp, method: 'GET' | 'POST', url: string, cookie: string, body?: unknown) {
  return built.app.inject({
    method,
    url,
    headers: { cookie, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(body === undefined ? {} : { payload: JSON.stringify(body) }),
  })
}

describe('revisión de trampas por HTTP', () => {
  it('el pulso cuenta las revisiones por contestar, y al contestar deja de contarlas', async () => {
    const built = await makeApp()

    apps.push(built)

    const cookie = await built.login()
    const pulse = async (): Promise<number> =>
      (json(await send(built, 'GET', '/pulse', cookie)) as { clickerReviews: number })
        .clickerReviews

    expect(await pulse()).toBe(0)

    // Una revisión que quien administra ya ha marcado como «probable».
    await built.db.execute(
      `INSERT INTO clicker_alerts
         (login, at, seconds, from_capital, to_capital, golden, trace, status, evidence)
       VALUES ('albrodri', '2026-10-16T10:00:00Z', 3, 1e6, 9e6, 0, '[]', 'asked',
               '{"from":1000000,"to":9000000,"seconds":3,"perSecond":800,"golden":false}')`,
    )
    expect(await pulse()).toBe(1)

    const [review] = json(await send(built, 'GET', '/clicker/reviews', cookie)) as {
      id: number
      evidence: { to: number }
    }[]

    expect(review?.evidence.to).toBe(9e6)
    // Corta no vale; con detalle, sí.
    expect(
      (await send(built, 'POST', `/clicker/reviews/${review?.id}`, cookie, { answer: 'no' }))
        .statusCode,
    ).toBe(400)
    expect(
      (
        await send(built, 'POST', `/clicker/reviews/${review?.id}`, cookie, {
          answer: 'Tenía una racha de bugs aplastados.',
        })
      ).statusCode,
    ).toBe(204)
    expect(await pulse()).toBe(0)
  })
})
