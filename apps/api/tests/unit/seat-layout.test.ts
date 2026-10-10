/**
 * Tests de la lectura de nombres de puesto.
 */

import { describe, expect, it } from 'vitest'

import { parseHost } from '../../src/modules/map/index.js'

describe('parseHost', () => {
  it.each([
    ['c1r2s4', { cluster: 'c1', row: 2, seat: 4 }],
    ['c3r7p7', { cluster: 'c3', row: 7, seat: 7 }],
    ['C2R17S2', { cluster: 'c2', row: 17, seat: 2 }],
    ['e1r10p12', { cluster: 'e1', row: 10, seat: 12 }],
    ['bess-f1r2s3', { cluster: 'bess-f1', row: 2, seat: 3 }],
  ])('%s', (host, expected) => {
    expect(parseHost(host)).toEqual(expected)
  })

  it.each(['sala-rara', '', 'c1', 'r2s4', 'c1r0s4', 'c1r2s0'])('no coloca "%s"', (host) => {
    expect(parseHost(host)).toBeNull()
  })
})
