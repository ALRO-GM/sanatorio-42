/**
 * Red: las cuentas del grafo sin lienzo (`graph-data.ts`): la huella que evita
 * recolocar con los mismos datos, los grupos de uniones por peso y el índice
 * que busca la burbuja bajo el ratón.
 */

import type { NetworkLink, NetworkNode } from '@sanatorio/contracts'
import { describe, expect, it } from 'vitest'

import { byWeight, graphSignature, spotAt, spotIndex } from '../src/features/network/graph-data'
import { mockNetwork } from '../src/shared/api/mock/network'

const node = (login: string, given = 3, community = 0): NetworkNode => ({
  login,
  image: null,
  external: false,
  given,
  received: 1,
  partners: 1,
  repetition: 0,
  reciprocity: 0,
  endogamy: 0,
  givenPassRate: null,
  receivedPassRate: null,
  community,
  cohort: null,
  campusId: null,
})
const link = (source: string, target: string, forth = 1, back = 0): NetworkLink => ({
  source,
  target,
  forth,
  back,
})

describe('huella de los datos', () => {
  const nodes = [node('ana'), node('eva', 5, 1)]
  const links = [link('ana', 'eva', 2, 1)]

  it('lo mismo en objetos nuevos (el sondeo cada 45 s) da la misma huella', () => {
    expect(
      graphSignature(
        nodes.map((one) => ({ ...one })),
        links.map((one) => ({ ...one })),
      ),
    ).toBe(graphSignature(nodes, links))
  })

  it('cambia con cualquier cosa que mueva el grafo', () => {
    const base = graphSignature(nodes, links)

    expect(graphSignature([node('ana'), node('eva', 6, 1)], links)).not.toBe(base)
    expect(graphSignature([node('ana'), node('eva', 5, 2)], links)).not.toBe(base)
    expect(graphSignature(nodes, [link('ana', 'eva', 3, 1)])).not.toBe(base)
    expect(graphSignature(nodes, [link('eva', 'ana', 2, 1)])).not.toBe(base)
    expect(graphSignature(nodes, [])).not.toBe(base)
    expect(graphSignature([], [])).toBe(graphSignature([], []))
  })

  it('con un campus grande sigue siendo un texto corto', () => {
    const many = Array.from({ length: 3000 }, (_, index) => node(`p${String(index)}`))
    const lots = many.slice(1).map((one, index) => link(`p${String(index)}`, one.login))

    expect(graphSignature(many, lots).length).toBeLessThan(30)
  })
})

describe('uniones por peso', () => {
  it('un grupo por peso, de menos a más; los muy fuertes, juntos', () => {
    const links = [3, 1, 3, 2, 60, 90, 1].map((weight, index) => ({ weight, index }))
    const groups = byWeight(links)

    expect(groups.map((group) => group.map((one) => one.weight))).toEqual([
      [1, 1],
      [2],
      [3, 3],
      [60, 90],
    ])
    expect(byWeight([])).toEqual([])
  })
})

describe('burbuja bajo el ratón', () => {
  const spots = [
    { id: 'grande', x: 0, y: 0, r: 30 },
    { id: 'pequeña', x: 50, y: 0, r: 3 },
    { id: 'lejos', x: 1000, y: 1000, r: 5 },
  ]
  const index = spotIndex(spots)

  it('acierta dentro de cada una, con margen para las pequeñas', () => {
    expect(spotAt(index, 10, 10, 0)?.id).toBe('grande')
    expect(spotAt(index, 55, 0, 4)?.id).toBe('pequeña')
    expect(spotAt(index, 1003, 1000, 0)?.id).toBe('lejos')
  })

  it('fuera de todas, ninguna; encima de dos, la de centro más cercano', () => {
    expect(spotAt(index, 500, 500, 4)).toBeNull()
    expect(spotAt(index, 56, 0, 0)).toBeNull()
    const overlap = spotIndex([
      { id: 'a', x: 0, y: 0, r: 20 },
      { id: 'b', x: 10, y: 0, r: 20 },
    ])

    expect(spotAt(overlap, 8, 0, 0)?.id).toBe('b')
    expect(spotAt(spotIndex([]), 0, 0, 10)).toBeNull()
  })

  it('con miles de burbujas da lo mismo que mirarlas todas', () => {
    const many = Array.from({ length: 5000 }, (_, index) => ({
      id: index,
      // Un pelo de más para que no haya dos en el mismo sitio (empatarían).
      x: ((index * 37) % 1000) + index / 10_000,
      y: (index * 91) % 1000,
      r: 2 + (index % 9),
    }))
    const big = spotIndex(many)
    const slow = (x: number, y: number): number | null => {
      let found: number | null = null
      let best = Infinity

      for (const spot of many) {
        const distance = Math.hypot(spot.x - x, spot.y - y)

        if (distance <= spot.r + 2 && distance < best) {
          found = spot.id
          best = distance
        }
      }

      return found
    }

    for (const [x, y] of [
      [10, 10],
      [500, 500],
      [37, 91],
      [999, 3],
      [250, 777],
    ] as const) {
      expect(spotAt(big, x, y, 2)?.id ?? null).toBe(slow(x, y))
    }
  })
})

describe('campus grande de la API de mentira', () => {
  it('como la API: con «todas» llegan como mucho 1 500 personas y 10 000 uniones', () => {
    const graph = mockNetwork('plopez-l', { campuses: '1', min: 1, limit: 20_000 })

    expect(graph.nodes).toHaveLength(1500)
    expect(graph.links.length).toBeLessThanOrEqual(10_000)
    expect(graph.links.length).toBeGreaterThan(1500)
    // Se dice cuánta gente queda fuera; son las menos activas.
    expect(graph.hidden?.nodes).toBeGreaterThan(1000)
    const activity = graph.nodes.map((one) => one.given + one.received)

    expect(activity).toEqual([...activity].sort((a, b) => b - a))
  })
})
