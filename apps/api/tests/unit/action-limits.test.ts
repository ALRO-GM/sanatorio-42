/**
 * Tests de los topes por persona regulables desde el panel (`core/limits.ts`).
 *
 * Lo importante: manda lo más concreto (persona > todo el mundo > fábrica), no
 * se sale de los márgenes, solo lo toca quien administra y los servicios lo
 * cumplen al momento (aquí, el chat del buzón).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { ACTION_LIMITS, createLimits, fixedLimits } from '../../src/core/limits.js'
import type { LimitsAdmin } from '../../src/core/limits.js'
import { MINUTE, actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'
import { json, makeApp } from '../helpers/test-app.js'
import type { TestApp } from '../helpers/test-app.js'

const admin = actor('albrodri', { admin: true })

describe('registro de topes', () => {
  let db: Db
  let limits: LimitsAdmin
  let now = Date.parse('2026-11-09T10:00:00.000Z')

  beforeEach(async () => {
    db = await openDatabase({ url: 'file::memory:' })
    limits = createLimits({ db, now: () => now })
  })

  afterEach(() => {
    closeDatabase(db)
  })

  it('sin cambios, cada tope vale lo de fábrica, que es lo que había escrito', async () => {
    expect(await limits.of('messages.perMinute', 'ana')).toBe(20)
    expect(await limits.of('messages.perMinuteChat', 'ana')).toBe(8)
    expect(await limits.of('brokenSeats.active', 'ana')).toBe(10)
    expect(await fixedLimits.of('countdowns.pins', 'ana')).toBe(12)

    const listed = await limits.list(admin, {})

    expect(listed.login).toBeNull()
    expect(listed.people).toEqual([])
    expect(listed.limits).toHaveLength(Object.keys(ACTION_LIMITS).length)
    for (const limit of listed.limits) {
      expect(limit.global).toBeNull()
      expect(limit.user).toBeNull()
      expect(limit.effective).toBe(limit.default)
      expect(limit.min).toBeLessThanOrEqual(limit.default)
      expect(limit.max).toBeGreaterThanOrEqual(limit.default)
    }
  })

  it('manda la persona, luego todo el mundo, luego fábrica', async () => {
    await limits.set(admin, { key: 'messages.perMinute', value: 30 })
    expect(await limits.of('messages.perMinute', 'ana')).toBe(30)
    expect(await limits.of('messages.perMinute', 'leo')).toBe(30)

    const ana = await limits.set(admin, { key: 'messages.perMinute', value: 5, login: 'Ana' })
    const row = ana.limits.find((limit) => limit.key === 'messages.perMinute')

    expect(ana.login).toBe('ana')
    expect(row).toMatchObject({ default: 20, global: 30, user: 5, effective: 5 })
    expect(ana.people).toEqual([{ login: 'ana', count: 1 }])
    // Al momento, sin esperar a que caduque nada; y el login, sin mayúsculas.
    expect(await limits.of('messages.perMinute', 'ana')).toBe(5)
    expect(await limits.of('messages.perMinute', 'ANA')).toBe(5)
    expect(await limits.of('messages.perMinute', 'leo')).toBe(30)

    // Quitar lo de la persona la devuelve a lo de todo el mundo, no a fábrica.
    await limits.set(admin, { key: 'messages.perMinute', value: null, login: 'ana' })
    expect(await limits.of('messages.perMinute', 'ana')).toBe(30)

    await limits.set(admin, { key: 'messages.perMinute', value: null })
    expect(await limits.of('messages.perMinute', 'ana')).toBe(20)
  })

  it('volver a fábrica a una persona quita todos sus topes y deja los de los demás', async () => {
    await limits.set(admin, { key: 'doubts.perDay', value: 3, login: 'ana' })
    await limits.set(admin, { key: 'help.activeRequests', value: 1, login: 'ana' })
    await limits.set(admin, { key: 'doubts.perDay', value: 4, login: 'leo' })

    const after = await limits.reset(admin, 'ana')

    expect(after.limits.every((limit) => limit.user === null)).toBe(true)
    expect(after.people).toEqual([{ login: 'leo', count: 1 }])
    expect(await limits.of('doubts.perDay', 'leo')).toBe(4)
  })

  it('justo en los márgenes vale; un paso fuera, no', async () => {
    const { min, max } = ACTION_LIMITS['help.activeRequests']

    await limits.set(admin, { key: 'help.activeRequests', value: min })
    await limits.set(admin, { key: 'help.activeRequests', value: max })
    expect(await limits.of('help.activeRequests', 'ana')).toBe(max)

    for (const value of [min - 1, max + 1, 0, -5, 2.5, Number.MAX_SAFE_INTEGER]) {
      await expectCode(limits.set(admin, { key: 'help.activeRequests', value }), 'invalid_input')
    }
    expect(await limits.of('help.activeRequests', 'ana')).toBe(max)
  })

  it('lo vacío, lo enorme y lo imprevisible se rechaza sin tocar nada', async () => {
    const bad: unknown[] = [
      undefined,
      null,
      {},
      [],
      'messages.perMinute',
      { key: 'messages.perMinute' },
      { key: 'no.existe', value: 5 },
      { key: '', value: 5 },
      { key: 'messages.perMinute', value: '5' },
      { key: 'messages.perMinute', value: 5, login: '' },
      { key: 'messages.perMinute', value: 5, login: 'x'.repeat(5000) },
      { key: 'messages.perMinute', value: 5, login: "ana'; DROP TABLE action_limits; --" },
      { key: 'x'.repeat(100_000), value: 5 },
    ]

    for (const input of bad) await expectCode(limits.set(admin, input), 'invalid_input')
    for (const login of ['', ' ', 'a b', 'x'.repeat(31), null, 5]) {
      await expectCode(limits.reset(admin, login), 'invalid_input')
    }
    await expectCode(limits.list(admin, { login: '../ana' }), 'invalid_input')
    expect((await limits.list(admin, {})).limits.every((limit) => limit.global === null)).toBe(true)
  })

  it('solo quien administra lo mira o lo cambia', async () => {
    const ana = actor('ana')

    await expectCode(limits.list(ana, {}), 'forbidden')
    await expectCode(limits.set(ana, { key: 'messages.perMinute', value: 200 }), 'forbidden')
    await expectCode(limits.reset(ana, 'ana'), 'forbidden')
    expect(await limits.of('messages.perMinute', 'ana')).toBe(20)
  })

  it('una clave retirada que siga en la base no cuenta', async () => {
    await db.execute({
      sql: `INSERT INTO action_limits (login, key, value, set_by, set_at)
            VALUES ('', 'retirado.hace.tiempo', 3, 'albrodri', '2026-01-01')`,
      args: [],
    })

    expect((await limits.list(admin, {})).limits.map((limit) => limit.key)).not.toContain(
      'retirado.hace.tiempo',
    )
  })

  it('lo cambiado por otro camino se ve al minuto, como mucho', async () => {
    expect(await limits.of('facility.perDay', 'ana')).toBe(10)
    await db.execute({
      sql: `INSERT INTO action_limits (login, key, value, set_by, set_at)
            VALUES ('', 'facility.perDay', 2, 'albrodri', '2026-11-09')`,
      args: [],
    })
    expect(await limits.of('facility.perDay', 'ana')).toBe(10)
    now += MINUTE
    expect(await limits.of('facility.perDay', 'ana')).toBe(2)
  })
})

describe('el chat del buzón cumple los topes', () => {
  const community = useCommunity()
  let services: Community['services']

  beforeEach(() => {
    ;({ services } = community)
  })

  const say = (who: string, id: string) =>
    services.meet.send(actor(who), null, { id, kind: 'text', body: 'hola' })

  it('de fábrica, 8 seguidos a una misma conversación', async () => {
    for (let index = 0; index < 8; index++) await say('ana', 'dm:ana:eva')
    await expectCode(say('ana', 'dm:ana:eva'), 'conflict')
  })

  it('con un tope propio, esa persona se para antes y las demás no', async () => {
    await services.limits.set(admin, { key: 'messages.perMinute', value: 2, login: 'ana' })

    await say('ana', 'dm:ana:eva')
    await say('ana', 'dm:ana:leo')
    await expectCode(say('ana', 'dm:ana:eva'), 'conflict')

    for (let index = 0; index < 3; index++) await say('leo', 'dm:eva:leo')
  })

  it('para todo el mundo, y la persona con el suyo por encima', async () => {
    await services.limits.set(admin, { key: 'messages.perMinuteChat', value: 1 })
    await services.limits.set(admin, { key: 'messages.perMinuteChat', value: 3, login: 'ana' })

    await say('leo', 'dm:eva:leo')
    await expectCode(say('leo', 'dm:eva:leo'), 'conflict')

    for (let index = 0; index < 3; index++) await say('ana', 'dm:ana:eva')
    await expectCode(say('ana', 'dm:ana:eva'), 'conflict')
  })

  it('pasado el minuto, vuelve a dejar', async () => {
    await services.limits.set(admin, { key: 'messages.perMinute', value: 1, login: 'ana' })
    await say('ana', 'dm:ana:eva')
    await expectCode(say('ana', 'dm:ana:eva'), 'conflict')
    community.clock.advance(MINUTE + 1)
    await say('ana', 'dm:ana:eva')
  })
})

describe('rutas de /admin/action-limits', () => {
  const apps: TestApp[] = []

  afterEach(async () => {
    for (const built of apps.splice(0)) await built.close()
  })

  it('quien no administra recibe 403 en las tres', async () => {
    const built = await makeApp()

    apps.push(built)

    const cookie = await built.login()

    for (const [method, url] of [
      ['GET', '/admin/action-limits'],
      ['PUT', '/admin/action-limits'],
      ['DELETE', '/admin/action-limits/ana'],
    ] as const) {
      const response = await built.app.inject({
        method,
        url,
        headers: { cookie },
        ...(method === 'PUT' ? { payload: { key: 'messages.perMinute', value: 200 } } : {}),
      })

      expect(response.statusCode, `${method} ${url}`).toBe(403)
    }
  })

  it('quien administra pone, mira y quita', async () => {
    const built = await makeApp({ ADMIN_LOGINS: 'albrodri' })

    apps.push(built)

    const cookie = await built.adminLogin()
    const put = await built.app.inject({
      method: 'PUT',
      url: '/admin/action-limits',
      headers: { cookie },
      payload: { key: 'tickets.open', value: 4, login: 'ana' },
    })

    expect(put.statusCode).toBe(200)

    const got = await built.app.inject({
      method: 'GET',
      url: '/admin/action-limits?login=ana',
      headers: { cookie },
    })
    const body = json(got) as { limits: { key: string; effective: number }[] }

    expect(body.limits.find((limit) => limit.key === 'tickets.open')?.effective).toBe(4)

    const outside = await built.app.inject({
      method: 'PUT',
      url: '/admin/action-limits',
      headers: { cookie },
      payload: { key: 'tickets.open', value: 0 },
    })

    expect(outside.statusCode).toBe(400)

    const reset = await built.app.inject({
      method: 'DELETE',
      url: '/admin/action-limits/ana',
      headers: { cookie },
    })

    expect((json(reset) as { people: unknown[] }).people).toEqual([])
  })
})
