/**
 * Red de correcciones: colores, leyendas y periodos.
 */

import type { NetworkNode } from '@sanatorio/contracts'
import { describe, expect, it } from 'vitest'

import {
  badgeStyle,
  COLOR_MODES,
  colorOf,
  inkOn,
  legendOf,
  luminanceOf,
  passColor,
} from '../src/features/network/colors'
import { dayOf, daysOf, periodOf, startOf } from '../src/shared/period'

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
  campusId: 22,
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
    expect(startOf('1', now)).toBe('2026-09-11')
    expect(startOf('3', now)).toBe('2026-07-11')
    expect(startOf('6', now)).toBe('2026-04-11')
    expect(startOf('12', now)).toBe('2025-10-11')
    expect(startOf('24', now)).toBe('2024-10-11')
    expect(daysOf('1', now)).toBe(30)
    expect(daysOf('12', now)).toBe(365)
    expect(daysOf('all', now)).toBeNull()
    expect(dayOf(now)).toBe('2026-10-11')
    // Los enlaces viejos siguen valiendo.
    expect(periodOf('year')).toBe('12')
    expect(periodOf('nada')).toBeNull()
  })
})

describe('red: varias escuelas', () => {
  it('pinta a cada quien del color de su escuela y lo cuenta en la leyenda', async () => {
    const { campusColor, colorOf, legendOf } = await import('../src/features/network/colors')
    const nodes = [
      node({ login: 'ana', campusId: 22 }),
      node({ login: 'eva', campusId: 22 }),
      node({ login: 'pau', campusId: 46 }),
      node({ login: 'fuera', campusId: null, external: true }),
    ]

    expect(colorOf(nodes[0] ?? node(), 'campus')).toBe(campusColor(22))
    expect(campusColor(22)).not.toBe(campusColor(46))

    const legend = legendOf(nodes, 'campus', (key) => key, undefined, [
      { id: 22, name: 'Madrid' },
      { id: 46, name: 'Barcelona' },
      { id: 37, name: 'Málaga' },
    ])

    // Solo las escuelas que tienen a alguien pintado, y al final quien viene de fuera.
    expect(legend.map((entry) => entry.label)).toEqual([
      'Madrid (2)',
      'Barcelona (1)',
      'net.legend.external',
    ])
  })
})

describe('tinta de las insignias de color', () => {
  /** Contraste WCAG entre dos luminancias. */
  const contrast = (a: number, b: number): number =>
    (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  const DARK = 0.0035

  it('calcula la luminancia de los colores conocidos', () => {
    expect(luminanceOf('hsl(0 0% 100%)')).toBeCloseTo(1, 3)
    expect(luminanceOf('hsl(0 0% 0%)')).toBeCloseTo(0, 3)
    expect(luminanceOf('hsl(0 100% 50%)')).toBeCloseTo(0.2126, 3)
    expect(luminanceOf('hsl(120 100% 50%)')).toBeCloseTo(0.7152, 3)
  })

  it('no entiende lo que no es un hsl: se queda con la tinta blanca', () => {
    expect(luminanceOf('#fff')).toBeNull()
    expect(luminanceOf('')).toBeNull()
    expect(inkOn('rojo')).toBe('#ffffff')
  })

  it('en todo el degradado, la tinta elegida se lee (al menos 4,5:1)', () => {
    for (let rate = 0; rate <= 1.0001; rate += 0.01) {
      const background = passColor(rate)
      const lum = luminanceOf(background) ?? 0
      const ink = inkOn(background)
      const inkLum = ink === '#ffffff' ? 1 : DARK

      expect(contrast(lum, inkLum), background).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('el verde y el ámbar llevan texto oscuro', () => {
    expect(badgeStyle(passColor(1))).toEqual({ background: passColor(1), color: '#080c0e' })
    expect(inkOn(passColor(0.9))).toBe('#080c0e')
  })
})
