/**
 * Red de correcciones: colores, leyendas y periodos.
 */

import type { NetworkNode } from '@sanatorio/contracts'
import { describe, expect, it } from 'vitest'

import { COLOR_MODES, colorOf, legendOf } from '../src/features/network/colors'
import { dayOf, startOf } from '../src/features/network/period'

const node = (extra: Partial<NetworkNode> = {}): NetworkNode => ({
  login: 'ana',
  image: null,
  external: false,
  given: 10,
  received: 10,
  partners: 8,
  endogamy: 40,
  reciprocity: 0.4,
  repetition: 0.4,
  givenPassRate: 0.8,
  receivedPassRate: 0.9,
  community: 0,
  cohort: 2025,
  ...extra,
})

const t = (key: string, vars: Record<string, string | number> = {}): string =>
  `${key}:${Object.values(vars).join(',')}`

describe('colores de la red', () => {
  it('cada modo da un color a cualquier persona', () => {
    for (const mode of COLOR_MODES) {
      expect(colorOf(node(), mode)).toMatch(/^hsl\(/)
      expect(
        colorOf(
          node({ givenPassRate: null, receivedPassRate: null, cohort: null, community: 99 }),
          mode,
        ),
      ).toMatch(/^hsl\(/)
    }
  })

  it('distingue lo que tiene que distinguir', () => {
    expect(colorOf(node({ community: 0 }), 'community')).not.toBe(
      colorOf(node({ community: 1 }), 'community'),
    )
    expect(colorOf(node({ endogamy: 5 }), 'endogamy')).not.toBe(
      colorOf(node({ endogamy: 90 }), 'endogamy'),
    )
    expect(colorOf(node({ external: true }), 'origin')).not.toBe(colorOf(node(), 'origin'))
    expect(colorOf(node({ given: 20, received: 0 }), 'balance')).not.toBe(
      colorOf(node({ given: 0, received: 20 }), 'balance'),
    )
    // Quien suspende una de cada cuatro o más sale igual de rojo.
    expect(colorOf(node({ givenPassRate: 0.75 }), 'failsGiven')).toBe(
      colorOf(node({ givenPassRate: 0.1 }), 'failsGiven'),
    )
    // Lo que alguien suspende al corregir y lo que le suspenden van por separado.
    const strictButGood = node({ givenPassRate: 0.5, receivedPassRate: 1 })

    expect(colorOf(strictButGood, 'failsGiven')).not.toBe(colorOf(strictButGood, 'failsReceived'))
    expect(colorOf(strictButGood, 'failsReceived')).toBe(
      colorOf(node({ givenPassRate: 1, receivedPassRate: 1 }), 'failsReceived'),
    )
  })

  it('la leyenda de comunidades cuenta a la gente, les pone año y junta las pequeñas', () => {
    const nodes = [
      node({ community: 0, cohort: 2024 }),
      node({ community: 0, cohort: 2024 }),
      node({ community: 0, cohort: 2026 }),
      node({ community: 1, cohort: null }),
      node({ community: 14 }),
      node({ community: 15 }),
    ]
    const legend = legendOf(nodes, 'community', t)

    // Cada comunidad lleva el año de llegada que más se repite en ella, si se sabe.
    expect(legend.map((entry) => entry.label)).toEqual([
      'net.legend.communityYear:1,3,2024',
      'net.legend.community:2,1',
      'net.legend.others:2',
    ])
  })

  it('la leyenda de años sale ordenada y sin repetir', () => {
    const legend = legendOf(
      [
        node({ cohort: 2026 }),
        node({ cohort: 2024 }),
        node({ cohort: 2026 }),
        node({ cohort: null }),
      ],
      'cohort',
      t,
    )

    expect(legend.map((entry) => entry.label)).toEqual(['2024', '2026'])
  })
})

describe('periodos de la red', () => {
  const now = Date.parse('2026-10-11T12:00:00.000Z')

  it('cada periodo empieza donde toca', () => {
    expect(startOf('all', now)).toBeNull()
    expect(startOf('month', now)).toBe('2026-09-11')
    expect(startOf('quarter', now)).toBe('2026-07-12')
    expect(startOf('year', now)).toBe('2025-10-11')
    expect(dayOf(now)).toBe('2026-10-11')
  })
})
