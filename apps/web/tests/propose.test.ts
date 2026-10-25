import { describe, expect, it } from 'vitest'

import type { ClusterMap, MapSeat } from '@sanatorio/contracts'

import { proposeSeats } from '../src/features/map/propose'

/**
 * Un cluster dibujado con letras, una fila por línea: `.` libre, `x` ocupado,
 * `#` roto, `m` donde estoy yo.
 */
function cluster(id: string, plan: string[]): ClusterMap['clusters'][number] {
  const seats: MapSeat[] = plan.flatMap((line, r) =>
    Array.from(line).map((mark, s) => ({
      host: `${id}r${r + 1}s${s + 1}`,
      row: r + 1,
      seat: s + 1,
      taken: false,
      reservation: null,
      broken: mark === '#' ? { by: 'ana', at: '2026-10-16T10:00:00.000Z' } : null,
      occupant:
        mark === 'x' || mark === 'm'
          ? {
              login: mark === 'm' ? 'yo' : `p${r}${s}`,
              image: null,
              projects: [],
              duty: null,
              me: mark === 'm',
              online: false,
              circle: null,
              finishedMine: null,
              focusUntil: null,
            }
          : null,
    })),
  )

  return {
    id,
    rows: plan.length,
    seatsPerRow: plan[0]?.length ?? 0,
    seats,
    occupied: 0,
    onDuty: 0,
  }
}

const map = (...clusters: ClusterMap['clusters']): ClusterMap => ({
  clusters,
  unplaced: [],
  me: { circle: null, projects: [] },
})

describe('proponer puestos', () => {
  it('prefiere una fila seguida a repartirse en dos', () => {
    expect(proposeSeats(map(cluster('c1', ['x..x', '....'])), 3)).toEqual([
      'c1r2s1',
      'c1r2s2',
      'c1r2s3',
    ])
  })

  it('no coge puestos ocupados, rotos ni reservados', () => {
    const plan = cluster('c1', ['.#.', 'x..'])
    const reserved = (seat: MapSeat): boolean => seat.host === 'c1r1s1'

    // Quedan libres r1s3, r2s2 y r2s3: la pareja de la misma fila.
    expect(proposeSeats(map(plan), 2, reserved)).toEqual(['c1r2s2', 'c1r2s3'])
    expect(proposeSeats(map(plan), 3, reserved)).toEqual(['c1r1s3', 'c1r2s2', 'c1r2s3'])
    // Cuatro no caben.
    expect(proposeSeats(map(plan), 4, reserved)).toBeNull()
  })

  it('si estás sentado, lo más cerca de ti y en tu cluster', () => {
    const far = cluster('c1', ['....'])
    const here = cluster('c2', ['m...', 'xxxx', '....'])

    expect(proposeSeats(map(far, here), 2)).toEqual(['c2r1s2', 'c2r1s3'])
  })
})
