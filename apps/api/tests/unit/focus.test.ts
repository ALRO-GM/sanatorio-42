/**
 * Pomodoro: empezar, acabar solo a su hora o antes, y que los demás lo vean en
 * la sala de espera, el plano y la ficha.
 */
import { beforeEach, describe, expect, it } from 'vitest'

import { actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

const MINUTE = 60_000
const settings = {
  focusMinutes: 25,
  breakMinutes: 5,
  sections: ['calendario'],
  show: ['corrections'],
}

describe('modo Pomodoro', () => {
  const community = useCommunity()
  let services: Community['services']
  let clock: Community['clock']
  let seat: Community['seat']

  beforeEach(() => {
    ;({ services, clock, seat } = community)
  })

  it('empieza con sus ajustes, acaba solo a su hora y recuerda los ajustes', async () => {
    const { focus } = services

    expect(await focus.view(actor('ana'))).toMatchObject({
      until: null,
      settings: { focusMinutes: 25 },
    })

    const started = await focus.start(actor('ana'), { ...settings, focusMinutes: 50 })

    expect(Date.parse(started.until ?? '') - clock.now()).toBe(50 * MINUTE)
    clock.advance(50 * MINUTE + 1)
    expect(await focus.view(actor('ana'))).toMatchObject({
      until: null,
      settings: { focusMinutes: 50 },
    })
  })

  it('acabar antes de tiempo; ajustes que no valen', async () => {
    const { focus } = services

    await focus.start(actor('ana'), settings)
    expect((await focus.stop(actor('ana'))).until).toBeNull()
    await expect(focus.stop(actor('leo'))).resolves.toMatchObject({ until: null })
    await expectCode(focus.start(actor('ana'), { ...settings, focusMinutes: 2 }), 'invalid_input')
    await expectCode(focus.start(actor('ana'), { ...settings, show: ['games'] }), 'invalid_input')
  })

  it('los demás lo ven en su ficha (el plano y la sala de espera usan la misma consulta)', async () => {
    const { focus, map } = services

    await seat({ ana: 'c1r2s3' })
    const { until } = await focus.start(actor('ana'), settings)

    expect((await map.personCard(actor('leo'), 'ana')).focusUntil).toBe(until)
    // Al acabar, ya no.
    await focus.stop(actor('ana'))
    expect((await map.personCard(actor('leo'), 'ana')).focusUntil).toBeNull()
  })
})

describe('registro y estadísticas del Pomodoro (#80)', () => {
  const community = useCommunity()
  let services: Community['services']
  let clock: Community['clock']

  beforeEach(() => {
    ;({ services, clock } = community)
  })

  /** Hoy en UTC, como lo pediría la web con `offset` 0. */
  const today = (): string => new Date(clock.now()).toISOString().slice(0, 10)
  const root = actor('root', { admin: true })

  it('apunta cómo acaba cada sesión: a su hora, parada con motivos, o sustituida', async () => {
    const { focus } = services

    // A su hora: nadie avisa, y aun así cuenta como completada.
    await focus.start(actor('ana'), settings)
    clock.advance(25 * MINUTE + 1)
    // Otra, que se sustituye al volver a empezar a los 5 minutos.
    await focus.start(actor('ana'), settings)
    clock.advance(5 * MINUTE)
    await focus.start(actor('ana'), settings)
    // Quiere acabar, se lo piensa y sigue; luego acaba de verdad.
    clock.advance(10 * MINUTE)
    await focus.stay(actor('ana'), { reasons: ['tired', 'tired'] })
    clock.advance(MINUTE)
    await focus.stop(actor('ana'), { reasons: ['urgent', 'tired'] })

    const stats = await focus.myStats(actor('ana'), { from: today(), to: today() })

    expect(stats.totals).toEqual({
      sessions: 3,
      completed: 1,
      cancelled: 1,
      stayed: 1,
      focusedSeconds: (25 + 5 + 11) * 60,
      people: 1,
    })
    // Repetido en una misma vez, cuenta una.
    expect(stats.reasons.find((one) => one.reason === 'tired')).toEqual({
      reason: 'tired',
      cancelled: 1,
      stayed: 1,
    })
    // Sola, no tiene con quién compararse; la media del tramo es la suya.
    expect(stats.position).toBeNull()
    expect(stats.band.sessions).toBe(3)
  })

  it('acabar sin motivos (o sin sesión) vale; seguir sin sesión no apunta nada', async () => {
    const { focus } = services

    await expect(focus.stop(actor('leo'))).resolves.toMatchObject({ until: null })
    await expect(focus.stay(actor('leo'), { reasons: [] })).resolves.toMatchObject({
      until: null,
    })
    await focus.start(actor('leo'), settings)
    await focus.stop(actor('leo'), null)
    // Parar otra vez, ya parada, no cambia lo apuntado.
    await focus.stop(actor('leo'), { reasons: ['other'] })

    const stats = await focus.myStats(actor('leo'), {})

    expect(stats.totals).toMatchObject({ sessions: 1, cancelled: 1, stayed: 0 })
    expect(stats.reasons.every((one) => one.cancelled === 0)).toBe(true)
  })

  it('motivos y periodos que no valen', async () => {
    const { focus } = services

    await focus.start(actor('ana'), settings)
    await expectCode(focus.stop(actor('ana'), { reasons: ['games'] }), 'invalid_input')
    await expectCode(focus.stay(actor('ana'), { reasons: 'tired' }), 'invalid_input')
    await expectCode(
      focus.stay(actor('ana'), { reasons: Array.from({ length: 50 }, () => 'tired') }),
      'invalid_input',
    )
    await expectCode(focus.myStats(actor('ana'), { from: '2026-02-31' }), 'invalid_input')
    await expectCode(
      focus.myStats(actor('ana'), { from: '2026-10-10', to: '2026-10-01' }),
      'invalid_input',
    )
    await expectCode(focus.myStats(actor('ana'), { low: 80, high: 20 }), 'invalid_input')
    await expectCode(focus.myStats(actor('ana'), { offset: 5000 }), 'invalid_input')
  })

  it('el periodo va por días; sin from, el total desde siempre; sin nada, vacío', async () => {
    const { focus } = services

    await focus.start(actor('ana'), settings)
    clock.advance(40 * 24 * 60 * MINUTE)
    await focus.start(actor('ana'), settings)

    expect((await focus.myStats(actor('ana'), { from: today() })).totals.sessions).toBe(1)
    expect((await focus.myStats(actor('ana'), {})).totals.sessions).toBe(2)

    const far = await focus.myStats(actor('ana'), { from: '2020-01-01', to: '2020-01-02' })

    expect(far.totals.sessions).toBe(0)
    expect(far.days).toEqual([])
  })

  it('la comparación: la media del tramo elegido y tu puesto entre quienes lo usan', async () => {
    const { focus } = services

    // ana 10 min, leo 20, mar 30 y sol 40, cada cual parando a su minuto.
    for (const [login, minutes] of [
      ['ana', 10],
      ['leo', 20],
      ['mar', 30],
      ['sol', 40],
    ] as const) {
      await focus.start(actor(login), { ...settings, focusMinutes: 60 })
      clock.advance(minutes * MINUTE)
      await focus.stop(actor(login), { reasons: ['done'] })
    }

    const top = await focus.myStats(actor('mar'), { low: 50, high: 100 })

    expect(top.position).toBe(67)
    expect(top.segment).toEqual({ low: 50, high: 100, people: 2, of: 4 })
    expect(top.band.focusedSeconds).toBe(35 * 60)
    // Lo suyo sigue siendo solo lo suyo.
    expect(top.totals.focusedSeconds).toBe(30 * 60)

    const everyone = await focus.adminStats(root, {})

    expect(everyone.totals).toMatchObject({ sessions: 4, cancelled: 4, people: 4 })
    expect(everyone.reasons.find((one) => one.reason === 'done')?.cancelled).toBe(4)
    expect((await focus.adminStats(root, { low: 0, high: 50 })).totals.focusedSeconds).toBe(30 * 60)
  })

  it('las del panel, solo para quien administra', async () => {
    await expectCode(services.focus.adminStats(actor('ana'), {}), 'forbidden')
  })
})
