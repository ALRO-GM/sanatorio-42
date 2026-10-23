import { describe, expect, it } from 'vitest'

import { clock, durationText } from '../src/shared/time'

describe('clock: cuenta atrás y cronómetro', () => {
  it('escribe m:ss y, con horas, h:mm:ss', () => {
    expect(clock(0)).toBe('0:00')
    expect(clock(59)).toBe('0:59')
    expect(clock(299)).toBe('4:59')
    expect(clock(3600 + 5 * 60 + 9)).toBe('1:05:09')
  })

  it('con lo negativo o decimal no se rompe', () => {
    expect(clock(-5)).toBe('0:00')
    expect(clock(61.9)).toBe('1:01')
    expect(clock(Number.MAX_SAFE_INTEGER)).toMatch(/^\d+:\d{2}:\d{2}$/)
  })
})

describe('durationText: una duración en corto', () => {
  it('segundos, minutos y horas con minutos', () => {
    expect(durationText(40)).toBe('40 s')
    expect(durationText(7 * 60)).toBe('7 min')
    expect(durationText(2 * 3600 + 5 * 60)).toBe('2 h 05 min')
  })

  it('redondea al minuto y no baja de cero', () => {
    expect(durationText(0)).toBe('0 s')
    expect(durationText(-3)).toBe('0 s')
    expect(durationText(89)).toBe('1 min')
    expect(durationText(3600 * 100)).toBe('100 h 00 min')
  })
})
