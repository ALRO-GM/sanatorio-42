/**
 * Red: las fechas a mano solo se piden cuando ya son fechas (#114 del buzón).
 * Al teclear el año, el campo de fecha da por buena cada cifra; pedir con
 * «0002-03-04» dejaba el grafo vacío y el periodo saltaba a uno fijo.
 */
import { describe, expect, it } from 'vitest'

import { usableDates } from '../src/features/network/dates'

const NOW = Date.parse('2026-11-14T12:00:00Z')

describe('usableDates', () => {
  it('dos fechas en orden, o una sola, valen', () => {
    expect(usableDates('2025-01-01', '2025-06-30', NOW)).toBe(true)
    expect(usableDates('2025-01-01', '', NOW)).toBe(true)
    expect(usableDates('', '2025-06-30', NOW)).toBe(true)
    expect(usableDates('', '', NOW)).toBe(true)
  })

  it('el mismo día en las dos vale; al revés, no', () => {
    expect(usableDates('2025-03-03', '2025-03-03', NOW)).toBe(true)
    expect(usableDates('2025-03-04', '2025-03-03', NOW)).toBe(false)
  })

  it('un año a medio escribir no se pide', () => {
    for (const typing of ['0002-03-04', '0020-03-04', '0202-03-04']) {
      expect(usableDates(typing, '', NOW)).toBe(false)
      expect(usableDates('', typing, NOW)).toBe(false)
    }
  })

  it('de 2013 al año que viene; ni antes ni después', () => {
    expect(usableDates('2013-01-01', '', NOW)).toBe(true)
    expect(usableDates('2012-12-31', '', NOW)).toBe(false)
    expect(usableDates('', '2027-12-31', NOW)).toBe(true)
    expect(usableDates('', '2028-01-01', NOW)).toBe(false)
  })

  it('lo que no es una fecha que exista, no', () => {
    for (const odd of ['2025-02-31', '2025-13-01', 'mañana', '2025-1-1', '9'.repeat(10_000)]) {
      expect(usableDates(odd, '', NOW)).toBe(false)
    }
  })
})
