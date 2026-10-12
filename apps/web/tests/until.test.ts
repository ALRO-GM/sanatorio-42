/**
 * Tests de "cuánto falta": lo que se le enseña a quien pone un evento para que
 * vea si la fecha es la que quería.
 */

import { describe, expect, it } from 'vitest'

import { es } from '../src/shared/i18n/es'
import { EVENT_HORIZON_DAYS, lastDay, untilText } from '../src/shared/until'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** El traductor de verdad, en español. */
const t = (key: string, vars: Record<string, string | number> = {}): string =>
  Object.entries(vars).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    es[key] ?? key,
  )

describe('cuánto falta para un evento', () => {
  it('lo dice en la unidad que toca, con el singular bien puesto', () => {
    expect(untilText(20 * 1000, t)).toBe('un momento')
    expect(untilText(MINUTE, t)).toBe('1 minuto')
    expect(untilText(45 * MINUTE, t)).toBe('45 minutos')
    expect(untilText(HOUR, t)).toBe('1 hora')
    expect(untilText(3 * HOUR + 20 * MINUTE, t)).toBe('3 horas y 20 minutos')
    expect(untilText(5 * DAY + 2 * HOUR, t)).toBe('5 días y 2 horas')
    expect(untilText(40 * DAY, t)).toBe('40 días')
    expect(untilText(64 * DAY, t)).toBe('2 meses y 4 días')
    // El error de siempre: el año que no era.
    expect(untilText(3 * 365 * DAY, t)).toBe('36 meses y 15 días')
  })

  it('el último día que se puede elegir es el de dentro de dos meses', () => {
    const now = new Date('2026-10-12T10:00:00').getTime()

    expect(EVENT_HORIZON_DAYS).toBe(62)
    expect(lastDay(now)).toBe('2026-12-13')
  })
})
