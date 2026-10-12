/**
 * Tests de Code Clicker, la sección secreta: la cuenta de la cruz, las
 * pastillas y la clasificación.
 *
 * El montaje (servicios de verdad, SQLite en memoria, reloj manual) está en
 * `tests/helpers/community.ts`.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { clickerLevel } from '../../src/modules/clicker/index.js'
import { actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

describe('code clicker', () => {
  const community = useCommunity()
  let services: Community['services']

  beforeEach(() => {
    ;({ services } = community)
  })

  /** Pulsa la cruz `times` veces, en envíos de veinte. */
  const press = async (login: string, times: number): Promise<void> => {
    for (let left = times; left > 0; left -= 20) {
      await services.clicker.plus(actor(login), { count: Math.min(20, left) })
    }
  }

  const SAVE = {
    save: '{"v":1}',
    rev: 0,
    session: 'pestaña-1',
    total: 1500,
    perSecond: 12,
    achievements: 6,
    prestige: 0,
  }

  it('cuenta las pulsaciones de la cruz, y no deja elegir antes de las cien', async () => {
    const { clicker } = services

    expect(await clicker.state(actor('ana'))).toEqual({
      plus: 0,
      pill: null,
      save: null,
      rev: 0,
      names: [],
    })

    await press('ana', 60)
    expect(await clicker.plus(actor('ana'), { count: 5 })).toEqual({ plus: 65, pill: null })
    await expectCode(clicker.choose(actor('ana'), { pill: 'red' }), 'conflict')
    // Ni envíos vacíos ni un millón de golpe.
    await expectCode(clicker.plus(actor('ana'), { count: 0 }), 'invalid_input')
    await expectCode(clicker.plus(actor('ana'), { count: 1000 }), 'invalid_input')
  })

  it('la azul es para siempre: ni cuenta más, ni juega, ni ve la clasificación', async () => {
    const { clicker } = services

    await press('leo', 100)
    expect(await clicker.choose(actor('leo'), { pill: 'blue' })).toMatchObject({ pill: 'blue' })

    await expectCode(clicker.choose(actor('leo'), { pill: 'red' }), 'conflict')
    expect(await clicker.plus(actor('leo'), { count: 20 })).toEqual({ plus: 100, pill: 'blue' })
    await expectCode(clicker.save(actor('leo'), SAVE), 'forbidden')
    await expectCode(clicker.board(actor('leo')), 'forbidden')
  })

  it('con la roja se guarda la partida y se entra en la clasificación', async () => {
    const { clicker } = services

    await press('ana', 100)
    await press('eva', 100)
    await clicker.choose(actor('ana'), { pill: 'red' })
    await clicker.choose(actor('eva'), { pill: 'red' })

    // Quien no ha guardado todavía no sale.
    expect(await clicker.board(actor('ana'))).toEqual({ entries: [], me: null })

    await clicker.save(actor('ana'), SAVE)
    await clicker.save(actor('eva'), { ...SAVE, total: 2e6, perSecond: 900, prestige: 1 })

    expect(await clicker.state(actor('ana'))).toMatchObject({ pill: 'red', save: '{"v":1}' })

    const board = await clicker.board(actor('ana'))

    expect(board.entries).toMatchObject([
      { rank: 1, login: 'eva', total: 2e6, level: 18, prestige: 1 },
      { rank: 2, login: 'ana', total: 1500, level: 9, achievements: 6 },
    ])
    expect(board.me).toMatchObject({ rank: 2, login: 'ana' })

    // El total de la clasificación no baja aunque se empiece una partida nueva.
    await clicker.save(actor('eva'), { ...SAVE, total: 10 })
    expect((await clicker.board(actor('eva'))).me).toMatchObject({ total: 2e6, perSecond: 12 })

    // Sin pastilla no hay partida, y una partida enorme o con cifras raras no entra.
    await expectCode(clicker.save(actor('leo'), SAVE), 'forbidden')
    await expectCode(clicker.save(actor('ana'), { ...SAVE, total: -1 }), 'invalid_input')
    await expectCode(
      clicker.save(actor('ana'), { ...SAVE, save: 'x'.repeat(90_000) }),
      'invalid_input',
    )
  })

  it('un dispositivo con la partida vieja no pisa la que se siguió en otro', async () => {
    const { clicker } = services
    const ana = actor('ana')

    await press('ana', 100)
    await clicker.choose(ana, { pill: 'red' })

    // El portátil y el móvil cargan la misma partida (rev 0); juega el portátil.
    expect(await clicker.save(ana, { ...SAVE, session: 'portatil-1' })).toEqual({ rev: 1 })
    expect(await clicker.save(ana, { ...SAVE, rev: 1, session: 'portatil-1' })).toEqual({ rev: 2 })

    // El móvil, que sigue con la de antes, no entra, y la partida no cambia.
    await expectCode(
      clicker.save(ana, { ...SAVE, save: '{"v":"vieja"}', session: 'movil-123' }),
      'conflict',
    )
    expect(await clicker.state(ana)).toMatchObject({ save: '{"v":1}', rev: 2 })

    // Si al portátil se le perdió una respuesta y manda una rev atrasada, entra:
    // es la misma pestaña.
    expect(await clicker.save(ana, { ...SAVE, rev: 1, session: 'portatil-1' })).toEqual({ rev: 3 })

    // El móvil recarga, parte de la rev que hay y pasa a tener la partida.
    expect(
      await clicker.save(ana, { ...SAVE, save: '{"v":"movil"}', rev: 3, session: 'movil-123' }),
    ).toEqual({ rev: 4 })
    await expectCode(clicker.save(ana, { ...SAVE, rev: 3, session: 'portatil-1' }), 'conflict')
    expect(await clicker.state(ana)).toMatchObject({ save: '{"v":"movil"}', rev: 4 })
  })

  it('quien administra ve el uso del juego, general y de cada persona', async () => {
    const { clicker, usage } = services
    const boss = actor('eva', { admin: true })

    await press('ana', 100)
    await press('leo', 100)
    await press('rut', 40)
    await clicker.choose(actor('ana'), { pill: 'red' })
    await clicker.choose(actor('leo'), { pill: 'blue' })
    await clicker.save(actor('ana'), { ...SAVE, save: '{"v":1,"clicks":321}' })
    await usage.record(actor('ana'), { counts: {}, time: { 'nav.clicker': [300, 60, 900] } })
    // El tiempo en otra sección no es tiempo de juego.
    await usage.record(actor('ana'), { counts: {}, time: { 'nav.tablon': [500, 0, 0] } })

    const seen = await clicker.usage(boss, {})

    expect(seen.days).toBe(7)
    expect(seen.totals).toEqual({
      pressed: 3,
      reached: 2,
      red: 1,
      blue: 1,
      players: 1,
      active: 3,
      total: 1500,
      saves: 1,
      seen: 300,
      back: 60,
      hidden: 900,
    })
    expect(seen.players.map((player) => player.login)).toEqual(['ana', 'leo', 'rut'])
    expect(seen.players[0]).toMatchObject({
      plus: 100,
      pill: 'red',
      level: 9,
      total: 1500,
      clicks: 321,
      saves: 1,
      seen: 300,
      hidden: 900,
    })
    expect(seen.players[2]).toMatchObject({ plus: 40, pill: null, total: 0, clicks: 0, seen: 0 })

    // Una partida que no se entiende no rompe la cuenta.
    await clicker.save(actor('ana'), { ...SAVE, rev: 1, save: 'no es json' })
    expect((await clicker.usage(boss, { days: '30' })).players[0]).toMatchObject({ clicks: 0 })

    await expectCode(clicker.usage(actor('ana'), {}), 'forbidden')
    await expectCode(clicker.usage(boss, { days: '0' }), 'invalid_input')
  })

  it('el nivel sube tres por cada cero del total', () => {
    expect(clickerLevel(0)).toBe(0)
    expect(clickerLevel(99)).toBe(6)
    expect(clickerLevel(1000)).toBe(9)
    expect(clickerLevel(1e6)).toBe(18)
    expect(clickerLevel(1e30)).toBe(90)
    expect(clickerLevel(-5)).toBe(0)
  })
})
