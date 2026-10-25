import { describe, expect, it } from 'vitest'

import { parseHost } from '../../src/modules/map/seat-layout.js'
import { seatHeatOf } from '../../src/modules/network/seating.heat.js'
import { seatingOf, seatWeight } from '../../src/modules/network/seating.rules.js'

const at = (host: string) => {
  const position = parseHost(host)

  if (position === null) throw new Error(host)

  return position
}
const weight = (a: string, b: string): number => seatWeight(at(a), at(b))
const HOUR = 3_600_000

describe('peso entre puestos (docs/asientos.md)', () => {
  it('desde 2·3N: al lado 3, enfrente 2, la fila de atrás 1,5', () => {
    expect(weight('c1r2s3', 'c1r2s1')).toBe(3)
    expect(weight('c1r2s3', 'c1r2s5')).toBe(3)
    expect(weight('c1r2s3', 'c1r2s2')).toBe(2)
    expect(weight('c1r2s3', 'c1r2s4')).toBe(2)
    expect(weight('c1r2s3', 'c1r1s2')).toBe(1.5)
    expect(weight('c1r2s3', 'c1r1s4')).toBe(1.5)
  })

  it('lo demás no cuenta: más lejos, la fila de delante, otro clúster', () => {
    expect(weight('c1r2s3', 'c1r2s7')).toBe(0)
    expect(weight('c1r2s3', 'c1r3s2')).toBe(0)
    expect(weight('c1r2s3', 'c1r1s3')).toBe(0)
    expect(weight('c1r2s3', 'c2r2s1')).toBe(0)
  })

  it('vale lo mismo en los dos sentidos: un sur mira a la fila de arriba', () => {
    expect(weight('c1r1s2', 'c1r2s3')).toBe(1.5)
    expect(weight('c1r1s2', 'c1r2s1')).toBe(1.5)
    expect(weight('c1r1s2', 'c1r1s4')).toBe(3)
  })
})

describe('cercanía entre personas', () => {
  it('suma horas a la vez por el peso y cuenta las horas sin nadie cerca', () => {
    const seating = seatingOf([
      { login: 'ana', host: 'c1r2s3', begin: 0, end: 4 * HOUR },
      { login: 'bea', host: 'c1r2s5', begin: 2 * HOUR, end: 6 * HOUR },
      { login: 'eva', host: 'c1r2s4', begin: 3 * HOUR, end: 5 * HOUR },
      // Lejos de todos: horas, pero sin pareja.
      { login: 'sol', host: 'c3r9s9', begin: 0, end: HOUR },
    ])
    const pair = (a: string, b: string) => seating.pairs.find((p) => p.a === a && p.b === b)

    // ana-bea: 2 h al lado; ana-eva: 1 h enfrente; bea-eva: 2 h enfrente.
    expect(pair('ana', 'bea')).toEqual({ a: 'ana', b: 'bea', closeness: 6, hours: 2 })
    expect(pair('ana', 'eva')).toEqual({ a: 'ana', b: 'eva', closeness: 2, hours: 1 })
    expect(pair('bea', 'eva')).toEqual({ a: 'bea', b: 'eva', closeness: 4, hours: 2 })

    const ana = seating.people.get('ana')

    expect(ana?.hours).toBe(4)
    // De 0 a 2 h, nadie cerca.
    expect(ana?.aloneHours).toBe(2)
    expect(ana?.partners).toBe(2)
    expect(seating.people.get('sol')).toMatchObject({ hours: 1, aloneHours: 1, partners: 0 })
  })
})

describe('mapa de calor de los puestos', () => {
  it('suma horas y gente por puesto y completa el plano con la letra de cada clúster', () => {
    const heat = seatHeatOf(
      [
        { login: 'ana', host: 'C3R1P2', begin: 0, end: 2 * HOUR },
        { login: 'ana', host: 'c3r1p2', begin: 3 * HOUR, end: 4 * HOUR },
        { login: 'bea', host: 'c3r1p2', begin: 0, end: HOUR / 2 },
        { login: 'bea', host: 'mac-del-fondo', begin: 0, end: HOUR },
      ],
      ['c3r2p1', 'nada'],
    )

    expect(heat.max).toBe(3.5)
    expect(heat.clusters).toEqual([
      {
        id: 'c3',
        rows: 2,
        seatsPerRow: 2,
        // El puesto de fuera del plano no suma ni horas ni gente al clúster.
        hours: 3.5,
        people: 2,
        cells: [
          { host: 'c3r1p1', row: 1, seat: 1, hours: 0, people: 0 },
          { host: 'c3r1p2', row: 1, seat: 2, hours: 3.5, people: 2 },
          { host: 'c3r2p1', row: 2, seat: 1, hours: 0, people: 0 },
          { host: 'c3r2p2', row: 2, seat: 2, hours: 0, people: 0 },
        ],
      },
    ])
  })

  it('la gente de un clúster es distinta, no la suma de sus puestos, y las horas son suyas', () => {
    const heat = seatHeatOf(
      [
        // Ana pasa por tres puestos de c1: una persona, no tres.
        { login: 'ana', host: 'c1r1s1', begin: 0, end: HOUR },
        { login: 'ana', host: 'c1r1s2', begin: HOUR, end: 2 * HOUR },
        { login: 'ana', host: 'c1r2s1', begin: 2 * HOUR, end: 2.25 * HOUR },
        { login: 'bea', host: 'c1r1s1', begin: 0, end: HOUR / 4 },
        // Dos sesiones de un cuarto de hora: cada puesto redondea a 0,3 h, el clúster da 0,5.
        { login: 'eva', host: 'c2r1s1', begin: 0, end: HOUR / 4 },
        { login: 'eva', host: 'c2r1s2', begin: 0, end: HOUR / 4 },
      ],
      ['c3r1s1'],
    )
    const totals = heat.clusters.map(({ id, hours, people }) => ({ id, hours, people }))

    expect(totals).toEqual([
      { id: 'c1', hours: 2.5, people: 2 },
      { id: 'c2', hours: 0.5, people: 1 },
      { id: 'c3', hours: 0, people: 0 },
    ])
    // Por puesto, la suma de personas da 4 en c1; por clúster, 2.
    const c1 = heat.clusters[0]?.cells ?? []

    expect(c1.reduce((sum, cell) => sum + cell.people, 0)).toBe(4)
    expect(heat.clusters[1]?.cells.map((cell) => cell.hours)).toEqual([0.3, 0.3])
  })

  it('sin puestos ni sesiones no hay clústeres', () => {
    expect(seatHeatOf([], [])).toEqual({ clusters: [], max: 0 })
  })
})
