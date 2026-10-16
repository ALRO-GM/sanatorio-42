/**
 * Code Clicker: cuándo sale la placa del botín de la bolsa común.
 */

import { describe, expect, it } from 'vitest'

import { LOOT, lootStep, lootTaken, nextLootAt } from '../src/features/clicker/loot'

const half = (): number => 0.5

describe('botín de la bolsa común', () => {
  it('la siguiente sale entre cuatro y nueve minutos después', () => {
    expect(nextLootAt(0, () => 0)).toBe(LOOT.minMs)
    expect(nextLootAt(0, () => 0.999_999)).toBeLessThan(LOOT.maxMs)
    expect(nextLootAt(1000, half)).toBe(1000 + (LOOT.minMs + LOOT.maxMs) / 2)
  })

  it('sale cuando toca, dura trece segundos y se va', () => {
    const waiting = { at: 100, up: null }

    expect(lootStep(waiting, 99, 10, half)).toBe(waiting)

    const shown = lootStep(waiting, 100, 10, half)

    expect(shown.up).toEqual({ until: 100 + LOOT.lifeMs, x: 0.5, y: 0.5 })
    // Mientras dura, sigue igual; un milisegundo después del final, se va.
    expect(lootStep(shown, 100 + LOOT.lifeMs, 10, half)).toBe(shown)
    expect(lootStep(shown, 101 + LOOT.lifeMs, 10, half).up).toBeNull()
  })

  it('con la bolsa vacía no sale, y la que había se va', () => {
    expect(lootStep({ at: 0, up: null }, 1e9, 0, half).up).toBeNull()
    expect(lootStep({ at: 0, up: { until: 1e9, x: 0, y: 0 } }, 10, 0, half).up).toBeNull()
    expect(lootStep({ at: 0, up: null }, 1e9, -5, half).up).toBeNull()
  })

  it('cogida, no hay otra hasta la siguiente', () => {
    expect(lootTaken(1000, half)).toEqual({ at: nextLootAt(1000, half), up: null })
  })
})
