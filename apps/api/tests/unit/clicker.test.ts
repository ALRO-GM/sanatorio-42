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

  const SAVE = { save: '{"v":1}', total: 1500, perSecond: 12, achievements: 6, prestige: 0 }

  it('cuenta las pulsaciones de la cruz, y no deja elegir antes de las cien', async () => {
    const { clicker } = services

    expect(await clicker.state(actor('ana'))).toEqual({
      plus: 0,
      pill: null,
      save: null,
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

  it('el nivel sube tres por cada cero del total', () => {
    expect(clickerLevel(0)).toBe(0)
    expect(clickerLevel(99)).toBe(6)
    expect(clickerLevel(1000)).toBe(9)
    expect(clickerLevel(1e6)).toBe(18)
    expect(clickerLevel(1e30)).toBe(90)
    expect(clickerLevel(-5)).toBe(0)
  })
})
