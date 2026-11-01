import { describe, expect, it } from 'vitest'

import { allCells, applyWeight, cellKey, partnerOf, reach } from '../src/features/network/seat-grid'

const keys = (cells: readonly { row: number; column: number }[]): string[] =>
  cells.map(cellKey).sort()
const EMPTY = [0, 1, 2].map(() => [0, 0, 0, 0, 0, 0, 0])

describe('cuadrícula de pesos de los puestos (docs/asientos.md)', () => {
  it('a distancia par la pareja es la casilla girada media vuelta; a distancia impar, ella misma', () => {
    // Al lado mirando igual: quien está 2 a tu derecha te ve 2 a su izquierda.
    expect(partnerOf({ row: 1, column: 5 })).toEqual({ row: 1, column: 1 })
    expect(partnerOf({ row: 0, column: 3 })).toEqual({ row: 2, column: 3 })
    expect(partnerOf({ row: 2, column: 4 })).toEqual({ row: 2, column: 4 })
  })

  it('con pareja y espejo, cada casilla arrastra a las suyas; nunca el centro', () => {
    expect(keys(reach([{ row: 2, column: 4 }], { partner: true, mirror: true }))).toEqual([
      '2:2',
      '2:4',
    ])
    expect(keys(reach([{ row: 0, column: 5 }], { partner: true, mirror: true }))).toEqual([
      '0:1',
      '0:5',
      '2:1',
      '2:5',
    ])
    expect(keys(reach([{ row: 0, column: 5 }], { partner: false, mirror: false }))).toEqual(['0:5'])
    expect(reach(allCells(), { partner: true, mirror: true })).toHaveLength(20)
  })

  it('el peso se queda entre 0 y 10, con dos decimales, y el centro sigue a 0', () => {
    const grid = applyWeight(
      EMPTY,
      [
        { row: 1, column: 3 },
        { row: 1, column: 1 },
      ],
      12.345,
    )

    expect(grid[1]).toEqual([0, 10, 0, 0, 0, 0, 0])
    expect(applyWeight(EMPTY, [{ row: 0, column: 0 }], 1.234)[0]?.[0]).toBe(1.23)
    expect(applyWeight(EMPTY, [{ row: 0, column: 0 }], -2)[0]?.[0]).toBe(0)
  })
})
