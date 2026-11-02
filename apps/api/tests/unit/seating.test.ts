import { describe, expect, it } from 'vitest'

import { parseHost } from '../../src/modules/map/seat-layout.js'
import { seatHeatOf } from '../../src/modules/network/seating.heat.js'
import { groupQuality } from '../../src/modules/network/seating.quality.js'
import { seatingOf, seatWeight, trimSeating } from '../../src/modules/network/seating.rules.js'

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
  it('suma horas a la vez por el peso y cuenta las horas sin nadie cerca', async () => {
    const seating = await seatingOf([
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

  it('de cada persona guarda sus tres puestos con más horas, de más a menos', async () => {
    const seating = await seatingOf(
      ['c1r1s1', 'c1r1s2', 'c1r1s2', 'c1r1s3', 'c1r1s3', 'c1r1s3', 'c1r1s4', 'mac'].map(
        (host, index) => ({ login: 'ana', host, begin: index * HOUR, end: (index + 1) * HOUR }),
      ),
    )

    expect(seating.people.get('ana')).toMatchObject({
      hours: 8,
      usual: ['c1r1s3', 'c1r1s2', 'c1r1s1'],
    })
  })

  it('con muchas sesiones va por tandas y cuenta lo mismo que de una vez', async () => {
    // 50 000 sesiones de una hora, de dos en dos y al lado: 25 000 h juntas.
    const sessions = Array.from({ length: 50_000 }, (_, index) => ({
      login: index % 2 === 0 ? 'ana' : 'bea',
      host: index % 2 === 0 ? 'c1r2s3' : 'c1r2s5',
      begin: Math.floor(index / 2) * 2 * HOUR,
      end: Math.floor(index / 2) * 2 * HOUR + HOUR,
    }))
    let others = 0
    const other = setInterval(() => (others += 1), 0)
    const seating = await seatingOf(sessions)

    clearInterval(other)
    expect(seating.pairs).toEqual([{ a: 'ana', b: 'bea', closeness: 75_000, hours: 25_000 }])
    // Entre tanda y tanda, otras cosas han podido pasar.
    expect(others).toBeGreaterThan(0)
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

describe('tope del grafo de asientos', () => {
  const people = ['ana', 'eva', 'leo', 'sol'].map((login, index) => ({ login, hours: 10 - index }))
  const pairs = [
    { a: 'ana', b: 'eva', closeness: 9 },
    { a: 'ana', b: 'sol', closeness: 8 },
    { a: 'eva', b: 'leo', closeness: 2 },
    { a: 'ana', b: 'leo', closeness: 5 },
  ]

  it('se queda con quien más horas pasa y, entre ellas, con las uniones más fuertes', () => {
    const shown = trimSeating(people, pairs, { nodes: 3, links: 2 })

    expect(shown.people.map((person) => person.login)).toEqual(['ana', 'eva', 'leo'])
    expect(shown.pairs.map((pair) => pair.closeness)).toEqual([9, 5])
  })

  it('si cabe todo, todo y en su orden; sin sitio, nada', () => {
    expect(trimSeating(people, pairs, { nodes: 10, links: 10 })).toEqual({ people, pairs })
    expect(trimSeating(people, pairs, { nodes: 0, links: 0 })).toEqual({ people: [], pairs: [] })
    expect(trimSeating([], [], { nodes: 3, links: 3 })).toEqual({ people: [], pairs: [] })
  })
})

describe('pesos a medida (panel, docs/asientos.md)', () => {
  const custom = (a: string, b: string, grid: number[][]): number => seatWeight(at(a), at(b), grid)
  const FRONT_ONLY = [
    [0, 0, 0, 4, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ]

  it('desde un norte, la fila de delante es la de arriba; desde un sur, la de abajo', () => {
    // Quien está delante te ve en su fila de atrás: solo con delante, la mitad.
    expect(custom('c1r2s3', 'c1r3s3', FRONT_ONLY)).toBe(2)
    expect(custom('c1r2s4', 'c1r1s4', FRONT_ONLY)).toBe(2)
    expect(custom('c1r2s3', 'c1r1s3', FRONT_ONLY)).toBe(2)
    expect(custom('c1r2s3', 'c1r4s3', FRONT_ONLY)).toBe(0)

    const both = FRONT_ONLY.map((row, at) => (at === 2 ? [0, 0, 0, 4, 0, 0, 0] : row))

    expect(custom('c1r2s3', 'c1r3s3', both)).toBe(4)
    expect(custom('c1r2s4', 'c1r1s4', both)).toBe(4)
  })

  it('si la cuadrícula no es simétrica, vale la media de los dos sentidos', () => {
    // Solo el de la derecha: desde 2·3N, 2·5N pesa 2; desde 2·5N, 2·3N está a la izquierda.
    const right = [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 2, 0],
      [0, 0, 0, 0, 0, 0, 0],
    ]

    expect(custom('c1r2s3', 'c1r2s5', right)).toBe(1)
    expect(custom('c1r2s5', 'c1r2s3', right)).toBe(1)
  })

  it('el mismo puesto y lo que queda fuera de la cuadrícula no cuentan', () => {
    const full = [0, 1, 2].map(() => [5, 5, 5, 5, 5, 5, 5])

    expect(custom('c1r2s3', 'c1r2s3', full)).toBe(0)
    expect(custom('c1r2s3', 'c1r2s7', full)).toBe(0)
    expect(custom('c1r2s3', 'c1r2s6', full)).toBe(5)
    expect(custom('c1r2s3', 'c1r4s3', full)).toBe(0)
  })
})

describe('calidad de los grupos', () => {
  it('dos grupos sin nada entre ellos: modularidad 0,5, todo dentro', () => {
    const community = new Map([
      ['a', 0],
      ['b', 0],
      ['c', 1],
      ['d', 1],
      ['e', 2],
    ])
    const quality = groupQuality(
      ['a', 'b', 'c', 'd', 'e'],
      [
        { a: 'a', b: 'b', closeness: 5 },
        { a: 'c', b: 'd', closeness: 5 },
      ],
      community,
    )

    expect(quality).toEqual({
      modularity: 0.5,
      communities: 2,
      grouped: 0.8,
      inside: 1,
      largest: 0.4,
      pairs: 2,
    })
  })

  it('sin uniones, todo a cero', () => {
    expect(groupQuality([], [], new Map())).toMatchObject({ modularity: 0, inside: 0, largest: 0 })
  })
})
