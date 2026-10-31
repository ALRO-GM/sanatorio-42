import { describe, expect, it } from 'vitest'

import { monotonePath } from '../src/features/stats/progressTrace'

/** La forma «continua y suave» del Avance: una curva que no baja ni se pasa. */

/** Los números de un trazo, de dos en dos: `[x, y]` de cada punto y control. */
const pairs = (d: string): [number, number][] => {
  const numbers = (d.match(/-?[\d.]+/g) ?? []).map(Number)

  return numbers.flatMap((_, index) =>
    index % 2 === 0 ? [[numbers[index] ?? 0, numbers[index + 1] ?? 0] as [number, number]] : [],
  )
}

describe('monotonePath', () => {
  it('vacía sin puntos y recta con uno o dos', () => {
    expect(monotonePath([])).toBe('')
    expect(monotonePath([[0, 10]])).toBe('M0.0,10.0')
    expect(
      monotonePath([
        [0, 10],
        [5, 20],
      ]),
    ).toBe('M0.0,10.0L5.0,20.0')
  })

  it('pasa por cada punto, en curvas', () => {
    const points: [number, number][] = [
      [0, 100],
      [10, 90],
      [20, 40],
      [30, 35],
    ]
    const d = monotonePath(points)

    expect(d.match(/C/g)).toHaveLength(3)
    // El final de cada curva es el punto siguiente.
    const all = pairs(d)

    expect([all[0], all[3], all[6], all[9]]).toEqual(points)
  })

  it('no se pasa: los puntos de control quedan entre los dos extremos de su tramo', () => {
    // Un salto grande tras un llano: una curva cualquiera bajaría del llano o subiría del techo.
    const points: [number, number][] = [
      [0, 200],
      [10, 200],
      [20, 20],
      [30, 20],
      [40, 10],
    ]
    const all = pairs(monotonePath(points))

    for (let segment = 0; segment < points.length - 1; segment++) {
      const [, from] = points[segment] ?? [0, 0]
      const [, to] = points[segment + 1] ?? [0, 0]
      const low = Math.min(from, to) - 0.05
      const high = Math.max(from, to) + 0.05

      for (const [, value] of all.slice(1 + segment * 3, 3 + segment * 3)) {
        expect(value).toBeGreaterThanOrEqual(low)
        expect(value).toBeLessThanOrEqual(high)
      }
    }
  })
})
