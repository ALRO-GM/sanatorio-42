import { describe, expect, it } from 'vitest'

import { ACHIEVEMENTS, hiddenAchievement } from '../src/features/clicker/data'
import { restore } from '../src/features/clicker/engine'

const saved = (achieved: string[]): string =>
  JSON.stringify({ v: 1, code: 10, total: 10, achieved })

describe('la puerta de la cruz, de 100 a 42', () => {
  it('quien tenía el logro de 50 se queda con el de beta tester, y los viejos desaparecen', () => {
    expect(restore(saved(['plus:1', 'plus:10', 'plus:50', 'plus:100']), 0)?.achieved).toEqual([
      'plus:1',
      'plus:10',
      'beta',
    ])
    // Sin el de 50, nada de beta. Y no se duplica.
    expect(restore(saved(['plus:1']), 0)?.achieved).toEqual(['plus:1'])
    expect(restore(saved(['plus:50', 'beta']), 0)?.achieved).toEqual(['beta'])
  })

  it('beta tester existe pero no sale en la lista hasta tenerlo', () => {
    expect(ACHIEVEMENTS).toContain('beta')
    expect(ACHIEVEMENTS).toContain('plus:21')
    expect(ACHIEVEMENTS).toContain('plus:42')
    expect(ACHIEVEMENTS).not.toContain('plus:50')
    expect(hiddenAchievement('beta')).toBe(true)
  })
})

describe('donar puntos a la bolsa de 42', () => {
  it('un 1 % más de producción por punto, con tope en el 42 %, y sus logros', async () => {
    const { donationBonus, newGame, tick } = await import('../src/features/clicker/engine')
    const game = newGame(0, () => 0.5)

    expect(donationBonus(game)).toBe(0)
    game.donated = 10
    expect(donationBonus(game)).toBeCloseTo(0.1)
    expect(tick(game, 1, () => 0.5, 0)).toEqual(expect.arrayContaining(['donate:0', 'donate:1']))
    expect(game.achieved).not.toContain('donate:2')
    game.donated = 500
    expect(donationBonus(game)).toBeCloseTo(0.42)
  })
})
