import { describe, expect, it } from 'vitest'

import { corners, monotonePath, pacePoints, smoothPath } from '../src/features/stats/progressTrace'

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

/** Una línea a escalones como las del Avance: puntos cada 15 días y los hitos dentro. */
const STEPS: [number, number][] = [
  [0, 0],
  [15, 0],
  [30, 0],
  [40, 20],
  [45, 20],
  [60, 20],
  [70, 50],
  [75, 50],
]

describe('corners (#115)', () => {
  it('se queda con el día en que llega a cada valor y con el último punto', () => {
    expect(corners(STEPS)).toEqual([
      [0, 0],
      [40, 20],
      [70, 50],
      [75, 50],
    ])
  })

  it('sin puntos, nada; con uno, ese', () => {
    expect(corners([])).toEqual([])
    expect(corners([[3, 4]])).toEqual([[3, 4]])
  })

  it('una línea quieta se queda en sus dos extremos', () => {
    expect(
      corners([
        [0, 7],
        [10, 7],
        [20, 7],
      ]),
    ).toEqual([
      [0, 7],
      [20, 7],
    ])
  })
})

describe('smoothPath (#115)', () => {
  it('no sale tumbada de cada punto: la tangente de una esquina no es cero', () => {
    const all = pairs(smoothPath(STEPS))

    // M, C(c1, c2, punto) por tramo: el segundo control del primer tramo y el
    // primero del segundo rodean la esquina (40, 20) y no están a su altura.
    expect(all[3]).toEqual([40, 20])
    expect(all[2]?.[1]).not.toBeCloseTo(20)
    expect(all[4]?.[1]).not.toBeCloseTo(20)
  })

  it('el llano del final va recto', () => {
    expect(smoothPath(STEPS).endsWith('L75.0,50.0')).toBe(true)
  })

  it('vacía sin puntos y sin números raros con muchos', () => {
    expect(smoothPath([])).toBe('')
    let value = 0
    const many = Array.from({ length: 5000 }, (_, day): [number, number] => {
      // Una línea que sube a ratos y a ratos se queda quieta, como cualquiera.
      if (day % 37 === 0) value += (day % 5) + 0.5

      return [day, value]
    })

    expect(smoothPath(many)).not.toMatch(/NaN|Infinity/)
  })
})

describe('pacePoints (#87)', () => {
  const PACE: [number, number][] = [
    [0, 0],
    [10, 14],
    [30, 28],
  ]

  it('sin días de bonus ni saltos, la línea de la API tal cual', () => {
    expect(pacePoints(PACE, 0, false)).toEqual(PACE)
  })

  it('con días de bonus, empieza más tarde', () => {
    expect(pacePoints(PACE, 5, false)).toEqual([
      [0, 0],
      [5, 0],
      [15, 14],
      [35, 28],
    ])
  })

  it('a saltos, sube el día de cada plazo', () => {
    expect(pacePoints(PACE, 5, true)).toEqual([
      [0, 0],
      [5, 0],
      [15, 0],
      [15, 14],
      [35, 14],
      [35, 28],
    ])
  })

  it('sin puntos, como mucho el arranque desde el día 0', () => {
    expect(pacePoints([], 9, true)).toEqual([[0, 0]])
    expect(pacePoints([], 0, true)).toEqual([])
  })
})
