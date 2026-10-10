/**
 * Tests de la conversión entre instantes y hora local de un campus.
 */

import { describe, expect, it } from 'vitest'

import { localMoment, zonedInstant } from '../../src/core/time.js'

describe('zonedInstant', () => {
  it('da el instante de una hora local, en horario de verano y de invierno', () => {
    // Madrid: UTC+2 en octubre (antes del cambio), UTC+1 en diciembre.
    expect(new Date(zonedInstant('2026-10-06', 16 * 60, 'Europe/Madrid')).toISOString()).toBe(
      '2026-10-06T14:00:00.000Z',
    )
    expect(new Date(zonedInstant('2026-12-01', 16 * 60, 'Europe/Madrid')).toISOString()).toBe(
      '2026-12-01T15:00:00.000Z',
    )
  })

  it('es la inversa de localMoment', () => {
    for (const zone of ['Europe/Madrid', 'Asia/Tokyo', 'America/Sao_Paulo', undefined]) {
      const instant = zonedInstant('2026-03-15', 9 * 60 + 30, zone)

      expect(localMoment(instant, zone)).toMatchObject({ day: '2026-03-15', minutes: 9 * 60 + 30 })
    }
  })

  it('sin zona, o con una que no existe, usa UTC', () => {
    expect(new Date(zonedInstant('2026-10-06', 60, undefined)).toISOString()).toBe(
      '2026-10-06T01:00:00.000Z',
    )
    expect(new Date(zonedInstant('2026-10-06', 60, 'Marte/Olimpo')).toISOString()).toBe(
      '2026-10-06T01:00:00.000Z',
    )
  })
})
