/**
 * El recorte de la red de asientos (`features/network/seat-trim.ts`): de cada
 * persona, solo la gente con la que más se sienta; con alguien elegido, solo
 * sus uniones.
 */
import { describe, expect, it } from 'vitest'

import { DEFAULT_TRIM, trimSeats } from '../../src/features/network/seat-trim'

const person = (login: string) => ({ login })
const link = (source: string, target: string, closeness: number) => ({
  source,
  target,
  closeness,
})

/** Ana pasa la mitad con Bea y Carla; el resto, repartido entre cinco más. */
const PEOPLE = ['ana', 'bea', 'carla', 'dani', 'eli', 'fran', 'gus', 'hugo'].map(person)
const LINKS = [
  link('ana', 'bea', 30),
  link('ana', 'carla', 20),
  link('ana', 'dani', 12),
  link('ana', 'eli', 11),
  link('ana', 'fran', 10),
  link('ana', 'gus', 9),
  link('ana', 'hugo', 8),
]

const pairs = (links: readonly { source: string; target: string }[]): string[] =>
  links.map((each) => [each.source, each.target].sort().join('-')).sort()

describe('recortar la red de asientos', () => {
  it('con el 50 %, de quien pasa la mitad con dos personas solo quedan esas dos', () => {
    const shown = trimSeats(PEOPLE, LINKS, { most: 'all', share: 0.5 }, 'ana')

    expect(shown.people.map((each) => each.login).sort()).toEqual(['ana', 'bea', 'carla'])
    expect(pairs(shown.links)).toEqual(['ana-bea', 'ana-carla'])
  })

  it('como mucho las N más cercanas, aunque no lleguen a la parte pedida', () => {
    const near = (most: number): string[] =>
      trimSeats(PEOPLE, LINKS, { most, share: 1 }, 'ana').people.map((each) => each.login)

    expect(near(1)).toEqual(['ana', 'bea'])
    expect(near(3)).toEqual(['ana', 'bea', 'carla', 'dani'])
    expect(near(10)).toHaveLength(8)
  })

  it('sin nadie elegido, una unión queda si es de las cercanas de cualquiera de las dos', () => {
    // Para Ana, Hugo es de lo último; para Hugo, Ana es su única unión: se queda.
    const shown = trimSeats(PEOPLE, LINKS, { most: 2, share: 1 })

    expect(pairs(shown.links)).toEqual(pairs(LINKS))

    // Entre dos personas sociables, la unión floja se va.
    const busy = [
      ...LINKS,
      link('bea', 'carla', 40),
      link('bea', 'dani', 35),
      link('carla', 'dani', 33),
    ]
    const trimmed = trimSeats(PEOPLE, busy, { most: 2, share: 1 })

    expect(pairs(trimmed.links)).not.toContain('ana-dani')
    expect(trimmed.people).toHaveLength(PEOPLE.length)
  })

  it('con alguien elegido, solo sus uniones, sin las de las demás entre sí', () => {
    const busy = [...LINKS, link('bea', 'carla', 40)]
    const shown = trimSeats(PEOPLE, busy, { most: 3, share: 1 }, 'ana')

    expect(pairs(shown.links)).toEqual(['ana-bea', 'ana-carla', 'ana-dani'])
  })

  it('todo y el 100 %: nada se recorta', () => {
    const shown = trimSeats(PEOPLE, LINKS, { most: 'all', share: 1 })

    expect(shown.links).toHaveLength(LINKS.length)
    expect(shown.people).toHaveLength(PEOPLE.length)
  })

  it('vacío, alguien sin uniones o que no está: no rompe', () => {
    expect(trimSeats([], [], DEFAULT_TRIM)).toEqual({ people: [], links: [] })

    const alone = trimSeats(PEOPLE, LINKS, DEFAULT_TRIM, 'nadie-con-este-login')

    // Quien no está en el grafo no lo vacía: se ve el grafo recortado de siempre.
    expect(alone.people).toHaveLength(PEOPLE.length)

    const lonely = trimSeats([...PEOPLE, person('iris')], LINKS, DEFAULT_TRIM, 'iris')

    expect(lonely.people.map((each) => each.login)).toEqual(['iris'])
    expect(lonely.links).toEqual([])
  })

  it('a igual cercanía, siempre lo mismo; y aguanta un grafo grande', () => {
    const ties = [link('ana', 'bea', 5), link('ana', 'carla', 5), link('ana', 'dani', 5)]
    const once = trimSeats(PEOPLE, ties, { most: 1, share: 1 }, 'ana')
    const again = trimSeats(PEOPLE, [...ties].reverse(), { most: 1, share: 1 }, 'ana')

    expect(once).toEqual(again)

    const many = Array.from({ length: 2000 }, (_, index) => person(`p${String(index)}`))
    // Cada cual con sus 20 siguientes: 40 000 parejas distintas.
    const lots = many.flatMap((_, index) =>
      Array.from({ length: 20 }, (_, step) =>
        link(
          `p${String(index)}`,
          `p${String((index + step + 1) % 2000)}`,
          ((index + step) % 97) + 1,
        ),
      ),
    )
    const started = performance.now()
    const shown = trimSeats(many, lots, DEFAULT_TRIM)

    expect(shown.links.length).toBeLessThan(lots.length)
    expect(performance.now() - started).toBeLessThan(2000)
  })
})
