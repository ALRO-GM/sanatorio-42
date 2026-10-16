import { describe, expect, it } from 'vitest'

import { donatedPoints } from '../../src/modules/clicker/donations.rules.js'

describe('lo donado a la bolsa de 42', () => {
  it('solo cuenta lo que resta puntos con «pool» en el motivo', () => {
    expect(
      donatedPoints([
        { reason: 'Earning after defense', sum: 1 },
        { reason: 'Defense plannification', sum: -1 },
        { reason: 'Provided points to the pool', sum: -3 },
        { reason: 'Given to the Pool', sum: -2 },
        // Lo que vuelve de la bolsa no es donar.
        { reason: 'Refund from the pool', sum: 4 },
      ]),
    ).toBe(5)
    expect(donatedPoints([])).toBe(0)
  })
})
