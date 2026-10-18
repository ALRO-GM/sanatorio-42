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
