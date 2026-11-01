/**
 * Red: dónde empieza cada burbuja (`graph-seed.ts`). Cada comunidad, junta y
 * apartada de las demás; quien va solo, por fuera.
 */

import { describe, expect, it } from 'vitest'

import { seedLayout, separateCommunities } from '../src/features/network/graph-seed'

const people = (groups: number[]): { login: string; community: number }[] =>
  groups.flatMap((count, community) =>
    Array.from({ length: count }, (_, at) => ({
      login: `p${String(community)}-${String(at)}`,
      community,
    })),
  )

type Point = { x: number; y: number }

const centre = (points: Point[]): Point => ({
  x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
  y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
})
const far = (points: Point[], from: Point): number =>
  Math.max(...points.map((point) => Math.hypot(point.x - from.x, point.y - from.y)))

describe('sitio inicial del grafo', () => {
  it('cada grupo empieza junto y sin pisar a los demás', () => {
    const list = people([30, 20, 12, 8])
    const spots = seedLayout(list)
    const groups = [0, 1, 2, 3].map((community) =>
      list
        .filter((person) => person.community === community)
        .map((person) => spots.get(person.login) as Point),
    )

    expect(spots.size).toBe(list.length)
    for (let a = 0; a < groups.length; a += 1) {
      for (let b = a + 1; b < groups.length; b += 1) {
        const ga = groups[a] ?? []
        const gb = groups[b] ?? []
        const ca = centre(ga)
        const cb = centre(gb)

        expect(Math.hypot(ca.x - cb.x, ca.y - cb.y)).toBeGreaterThan(far(ga, ca) + far(gb, cb))
      }
    }
  })

  it('quien va solo, por fuera de los grupos; los mismos datos, el mismo dibujo', () => {
    const list = [...people([10, 10]), { login: 'solo', community: 99 }]
    const spots = seedLayout(list)
    const solo = spots.get('solo') as Point
    const grouped = list.slice(0, 20).map((person) => spots.get(person.login) as Point)

    expect(Math.hypot(solo.x, solo.y)).toBeGreaterThan(far(grouped, { x: 0, y: 0 }))
    expect(seedLayout(list)).toEqual(spots)
  })

  it('dos grupos encima el uno del otro se empujan en sentidos opuestos', () => {
    const nodes = [
      { community: 0, x: 0, y: 0, vx: 0, vy: 0 },
      { community: 0, x: 2, y: 0, vx: 0, vy: 0 },
      { community: 1, x: 4, y: 0, vx: 0, vy: 0 },
      { community: 1, x: 6, y: 0, vx: 0, vy: 0 },
    ]

    separateCommunities(nodes, (node) => node.community)(1)
    expect(nodes[0]?.vx).toBeLessThan(0)
    expect(nodes[3]?.vx).toBeGreaterThan(0)
  })
})
