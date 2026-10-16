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
