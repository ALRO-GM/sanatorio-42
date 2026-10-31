import { describe, expect, it } from 'vitest'

import { bestOf, between, meanOf, rankPool } from '../src/features/stats/piscineTop'
import type { Swimmer } from '../src/features/stats/piscineTop'

/**
 * La piscina ordenada en la vista sin límites del dueño (`docs/piscineros.md`):
 * puestos, percentiles, la media de los mejores y quién cae entre dos.
 */

const swimmer = (login: string, line: (number | null)[], lastDay: number | null): Swimmer => ({
  login,
  image: null,
  line,
  done: [...line].reverse().find((value) => value !== null) ?? 0,
  milestones: lastDay === null ? [] : [{ day: lastDay, projects: ['x'], value: 1 }],
})

const POOL = [
  swimmer('c', [0, 1, 1], 1),
  swimmer('a', [1, 2, 3], 2),
  swimmer('b', [1, 2, 3], 1),
  swimmer('d', [0, 0, 0], null),
]

describe('los más avanzados de la piscina', () => {
  it('más aprobado primero; a igualdad, quien llegó antes; percentil 100 el primero', () => {
    const ranked = rankPool(POOL)

    expect(ranked.map((each) => [each.login, each.rank, each.percentile])).toEqual([
      ['b', 1, 100],
      ['a', 2, 75],
      ['c', 3, 50],
      ['d', 4, 25],
    ])
  })

  it('quien empata en todo comparte puesto', () => {
    const ranked = rankPool([swimmer('x', [1], 0), swimmer('y', [1], 0), swimmer('z', [0], null)])

    expect(ranked.map((each) => each.rank)).toEqual([1, 1, 3])
  })

  it('los mejores X %, como poco uno; entre dos percentiles, los dos incluidos', () => {
    const ranked = rankPool(POOL)

    expect(bestOf(ranked, 50).map((each) => each.login)).toEqual(['b', 'a'])
    expect(bestOf(ranked, 1).map((each) => each.login)).toEqual(['b'])
    expect(bestOf([], 10)).toEqual([])
    expect(between(ranked, 50, 75).map((each) => each.login)).toEqual(['a', 'c'])
  })

  it('la media punto a punto, sin contar a quien no tiene dato', () => {
    expect(
      meanOf(
        [
          [1, 2, null],
          [2, null, null],
        ],
        3,
      ),
    ).toEqual([1.5, 2, null])
  })
})
