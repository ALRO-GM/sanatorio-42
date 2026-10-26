/**
 * Tests de la lectura de nombres de puesto.
 */

import { describe, expect, it } from 'vitest'

import { clusterBounds, hostAt, isInside, parseHost } from '../../src/modules/map/index.js'
import type { SeatPosition } from '../../src/modules/map/index.js'

describe('parseHost', () => {
  it.each([
    ['c1r2s4', { cluster: 'c1', row: 2, seat: 4, separator: 's' }],
    ['c3r7p7', { cluster: 'c3', row: 7, seat: 7, separator: 'p' }],
    ['C2R17S2', { cluster: 'c2', row: 17, seat: 2, separator: 's' }],
    ['e1r10p12', { cluster: 'e1', row: 10, seat: 12, separator: 'p' }],
    ['bess-f1r2s3', { cluster: 'bess-f1', row: 2, seat: 3, separator: 's' }],
    // París: un clúster por planta, y `f1b` es la entreplanta de la 1.
    ['f1r11s15', { cluster: 'f1', row: 11, seat: 15, separator: 's' }],
    ['f1br2s8', { cluster: 'f1b', row: 2, seat: 8, separator: 's' }],
    ['f0r13s23', { cluster: 'f0', row: 13, seat: 23, separator: 's' }],
    ['F6R9S16', { cluster: 'f6', row: 9, seat: 16, separator: 's' }],
  ])('%s', (host, expected) => {
    expect(parseHost(host)).toEqual(expected)
  })

  it.each(['sala-rara', '', 'c1', 'r2s4', 'c1r0s4', 'c1r2s0'])('no coloca "%s"', (host) => {
    expect(parseHost(host)).toBeNull()
  })

  // Lo que dan como «puesto» las cuentas del staff y los bots de París (y
  // alguna errata): ni se coloca ni forma clúster.
  it.each([
    'POISSON POISSON POISSON 🐟🐟🐟',
    'Hogwarts',
    'Frozen 🥶',
    'Dans son Hoodie',
    'bocal',
    'oven',
    'F',
    'Hogwa',
    'r1s1',
    'dans son hoodier1s2',
    '🐟r1s1',
    'f1r123s4',
    'un-nombre-larguisimo-de-sala-r1s1',
  ])('no coloca el «puesto» de broma "%s"', (host) => {
    expect(parseHost(host)).toBeNull()
  })
})

/** Un puesto que se sabe colocar. */
const at = (host: string): SeatPosition => {
  const position = parseHost(host)

  if (position === null) throw new Error(host)

  return position
}

/** Varios puestos que se saben colocar. */
const positions = (...hosts: string[]): SeatPosition[] => hosts.map((host) => at(host))

/** Todos los puestos de un clúster de `rows` × `seats`. */
const full = (cluster: string, rows: number, seats: number): string[] =>
  Array.from({ length: rows * seats }, (_, index) =>
    hostAt({
      cluster,
      separator: 's',
      row: Math.floor(index / seats) + 1,
      seat: (index % seats) + 1,
    }),
  )

describe('clusterBounds', () => {
  it('mide cada clúster por lo que se ha visto, con su letra', () => {
    const bounds = clusterBounds(positions('f1r11s15', 'f1r13s23', 'f1br10s21', 'c3r7p7'))

    expect(bounds.get('f1')).toEqual({ cluster: 'f1', separator: 's', row: 13, seat: 23 })
    expect(bounds.get('f1b')).toEqual({ cluster: 'f1b', separator: 's', row: 10, seat: 21 })
    expect(bounds.get('c3')).toEqual({ cluster: 'c3', separator: 'p', row: 7, seat: 7 })
  })

  it('una errata suelta no agranda el clúster: se queda fuera', () => {
    const seen = positions(...full('f1', 13, 23), 'f1r13s93', 'f1r45s3')
    const bounds = clusterBounds(seen)

    expect(bounds.get('f1')).toMatchObject({ row: 13, seat: 23 })
    expect(isInside(at('f1r13s93'), bounds)).toBe(false)
    expect(isInside(at('f1r45s3'), bounds)).toBe(false)
    expect(isInside(at('f1r13s23'), bounds)).toBe(true)
    expect(isInside(at('f9r1s1'), bounds)).toBe(false)
  })

  it('crece con lo que se va viendo aunque haya huecos', () => {
    // Un clúster recién descubierto: pocos puestos vistos, con saltos normales.
    const bounds = clusterBounds(positions('f4r1s2', 'f4r4s7', 'f4r9s12', 'f4r14s16'))

    expect(bounds.get('f4')).toMatchObject({ row: 14, seat: 16 })
    // Como dos de producción, vistos a medias: filas 1, 8, 15 y 16, o 2, 11, 14 y 16.
    expect(
      clusterBounds(positions('c1r1s1', 'c1r8s2', 'c1r15s3', 'c1r16s3')).get('c1'),
    ).toMatchObject({ row: 16, seat: 3 })
    expect(
      clusterBounds(positions('c3r2s1', 'c3r11s4', 'c3r14s2', 'c3r16s3')).get('c3'),
    ).toMatchObject({ row: 16, seat: 4 })
  })

  it('nunca pasa de 50 filas o puestos, ni con todo visto', () => {
    const bounds = clusterBounds(positions(...full('x1', 2, 60).filter((_, i) => i % 3 === 0)))

    expect(bounds.get('x1')?.seat).toBeLessThanOrEqual(50)
  })

  it('un clúster del que solo hay erratas mide 0 y no se dibuja', () => {
    expect(clusterBounds(positions('z1r1s77')).get('z1')).toMatchObject({ row: 1, seat: 0 })
    expect(clusterBounds([]).size).toBe(0)
  })
})

describe('hostAt', () => {
  it('es la inversa de parseHost, con la letra de cada campus', () => {
    for (const host of ['c1r2s4', 'c3r7p7', 'bess-f1r2s3']) {
      const position = parseHost(host)

      expect(position).not.toBeNull()
      expect(position === null ? '' : hostAt(position)).toBe(host)
    }
  })
})
