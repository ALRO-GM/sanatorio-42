/**
 * Orden de las tablas por varias columnas: el último clic manda y los
 * anteriores deciden los empates.
 */
import { describe, expect, it } from 'vitest'

import { cellValue, pressColumn, sortRows } from '../src/shared/table-sort'
import type { SortKey } from '../src/shared/table-sort'

type Row = { login: string; level: number | null; corrections: number }

const ROWS: Row[] = [
  { login: 'ana', level: 3, corrections: 10 },
  { login: 'leo', level: 7, corrections: 4 },
  { login: 'uma', level: 5, corrections: 10 },
  { login: 'eva', level: null, corrections: 4 },
  { login: 'sol', level: 7, corrections: 10 },
]
const value = (row: Row, column: string): number | string | null => row[column as keyof Row] ?? null
const logins = (order: SortKey[]): string[] => sortRows(ROWS, order, value).map((row) => row.login)

describe('orden de las tablas', () => {
  it('ordenar por nivel y después por correcciones deja los empates de correcciones por nivel', () => {
    let order = pressColumn([], 'level', 'desc')

    order = pressColumn(order, 'corrections', 'desc')
    expect(order).toEqual([
      { id: 'corrections', dir: 'desc' },
      { id: 'level', dir: 'desc' },
    ])
    // 10 correcciones: sol (7), uma (5), ana (3). 4: leo (7) y eva (sin nivel, al final).
    expect(logins(order)).toEqual(['sol', 'uma', 'ana', 'leo', 'eva'])
  })

  it('volver a pulsar la que manda le da la vuelta; pulsar una anterior la sube', () => {
    let order = pressColumn(pressColumn([], 'level', 'desc'), 'corrections', 'desc')

    order = pressColumn(order, 'corrections', 'desc')
    expect(order[0]).toEqual({ id: 'corrections', dir: 'asc' })
    expect(order[1]).toEqual({ id: 'level', dir: 'desc' })

    order = pressColumn(order, 'level', 'desc')
    expect(order.map((key) => key.id)).toEqual(['level', 'corrections'])
    expect(order[0]?.dir).toBe('desc')
  })

  it('lo vacío va siempre al final, en los dos sentidos', () => {
    expect(logins([{ id: 'level', dir: 'desc' }]).at(-1)).toBe('eva')
    expect(logins([{ id: 'level', dir: 'asc' }]).at(-1)).toBe('eva')
  })

  it('sin orden, o con empate en todo, se queda como venía', () => {
    expect(logins([])).toEqual(ROWS.map((row) => row.login))
    const tied = sortRows(
      [
        { n: 1, k: 'a' },
        { n: 1, k: 'b' },
        { n: 1, k: 'c' },
      ],
      [{ id: 'n', dir: 'desc' }],
      (row) => row.n,
    )

    expect(tied.map((row) => row.k)).toEqual(['a', 'b', 'c'])
  })

  it('los textos se ordenan sin mayúsculas ni tildes y con los números en su sitio', () => {
    const rows = ['Zoe', 'álvaro', 'Ana', 'c10', 'c2'].map((name) => ({ name }))
    const sorted = sortRows(rows, [{ id: 'name', dir: 'asc' }], (row) => row.name)

    expect(sorted.map((row) => row.name)).toEqual(['álvaro', 'Ana', 'c2', 'c10', 'Zoe'])
  })

  it('una celda de texto que es un número se ordena como número', () => {
    expect(cellValue('42')).toBe(42)
    expect(cellValue('3,5')).toBe(3.5)
    expect(cellValue('abc')).toBe('abc')
    expect(cellValue('')).toBeNull()
    expect(cellValue(null)).toBeNull()
    expect(cellValue(7)).toBe(7)
  })
})
