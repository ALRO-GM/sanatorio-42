/**
 * Estadísticas del Pomodoro: lo que se pide a la API para cada periodo, y
 * «Fechas…», el periodo elegido a mano (#80 del buzón).
 */

import { describe, expect, it } from 'vitest'

import { periodQuery } from '../src/features/focus/FocusStatsView'

const EVERYONE = { low: 0, high: 100 }
// Un mediodía fijo: en cualquier zona horaria del test sigue siendo el 14 de noviembre.
const AT = Date.parse('2026-11-14T12:00:00Z')
const range = (period: 'day' | 'week' | 'month' | 'total' | 'custom', from = '', to = '') => ({
  period,
  from,
  to,
})

describe('periodo del Pomodoro', () => {
  it('normal: con «Fechas…» se piden justo esas dos', () => {
    expect(periodQuery(range('custom', '2026-10-01', '2026-10-31'), EVERYONE, AT)).toMatchObject({
      from: '2026-10-01',
      to: '2026-10-31',
      low: 0,
      high: 100,
    })
  })

  it('límite: un solo día vale, y dos fechas al revés se ordenan', () => {
    expect(periodQuery(range('custom', '2026-11-01', '2026-11-01'), EVERYONE, AT)).toMatchObject({
      from: '2026-11-01',
      to: '2026-11-01',
    })
    expect(periodQuery(range('custom', '2026-11-10', '2026-11-02'), EVERYONE, AT)).toMatchObject({
      from: '2026-11-02',
      to: '2026-11-10',
    })
  })

  it('vacío: sin las dos fechas se ve el mes, nunca una zona en blanco', () => {
    const month = periodQuery(range('month'), EVERYONE, AT)

    expect(periodQuery(range('custom'), EVERYONE, AT)).toEqual(month)
    expect(periodQuery(range('custom', '2026-10-01'), EVERYONE, AT)).toEqual(month)
    expect(month.to).toBe('2026-11-14')
    // El total no tiene principio.
    expect(periodQuery(range('total'), EVERYONE, AT).from).toBeUndefined()
  })

  it('imprevisible: una fecha que no existe o con otra forma no llega a la API', () => {
    const month = periodQuery(range('month'), EVERYONE, AT)

    for (const bad of [
      '2026-02-30',
      '2026-13-01',
      '1/11/2026',
      "2026-11-01'; --",
      'x'.repeat(5000),
    ]) {
      expect(periodQuery(range('custom', bad, '2026-11-10'), EVERYONE, AT)).toEqual(month)
      expect(periodQuery(range('custom', '2026-11-01', bad), EVERYONE, AT)).toEqual(month)
    }
  })
})
