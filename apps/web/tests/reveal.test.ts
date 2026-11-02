/**
 * El orden en que aparece un grafo al llegar (`features/network/reveal.ts`):
 * desde ti hacia fuera, y lo que no cuelga de ti al final.
 */

import { describe, expect, it } from 'vitest'

import type { NetworkLink, NetworkNode } from '@sanatorio/contracts'

import { revealOrder } from '../src/features/network/reveal'

const node = (login: string) => ({ login }) as NetworkNode
const link = (source: string, target: string) => ({ source, target }) as NetworkLink

describe('aparición del grafo', () => {
  it('primero tú, luego tu gente y luego la gente de tu gente; quien va suelto, al final', () => {
    const nodes = ['zoe', 'leo', 'yo', 'ana', 'eva', 'sol'].map(node)
    const links = [link('yo', 'ana'), link('leo', 'yo'), link('ana', 'eva'), link('zoe', 'sol')]

    expect(revealOrder(nodes, links, 'yo')).toEqual(['yo', 'ana', 'leo', 'eva', 'zoe', 'sol'])
  })

  it('sin ti en el grafo (o sin nadie elegido), en el orden en que llegó, sin repetir', () => {
    const nodes = ['b', 'a', 'c'].map(node)
    const links = [link('a', 'b'), link('b', 'a'), link('a', 'fuera')]

    expect(revealOrder(nodes, links, 'nadie')).toEqual(['b', 'a', 'c'])
    expect(revealOrder(nodes, links, null)).toEqual(['b', 'a', 'c'])
    expect(revealOrder([], [], 'yo')).toEqual([])
  })

  it('con miles de burbujas, cada una sale una vez', () => {
    const nodes = Array.from({ length: 3_000 }, (_, i) => node(`p${String(i)}`))
    const links = nodes.slice(1).map((each, i) => link(`p${String(i)}`, each.login))
    const order = revealOrder(nodes, links, 'p0')

    expect(order).toHaveLength(3_000)
    expect(new Set(order).size).toBe(3_000)
    expect(order[0]).toBe('p0')
  })
})
