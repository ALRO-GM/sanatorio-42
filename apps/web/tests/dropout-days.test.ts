/**
 * Abandono por días: el eje va por días de piscina (1 = el lunes del inicio)
 * hasta el 26, el viernes del examen final, con los de examen marcados.
 */
import type { DropoutReport } from '@sanatorio/contracts'
import { describe, expect, it } from 'vitest'

import { departures, isExamDay, LAST_POOL_DAY } from '../src/features/dropout/dropout'

/** Un informe con 30 días seguidos desde un lunes y las bajas que se pidan. */
function report(leftOn: string[]): DropoutReport {
  const days = Array.from({ length: 30 }, (_, index) => {
    const day = new Date(Date.UTC(2026, 8, 7 + index)).toISOString().slice(0, 10)

    return { day, weekday: (index % 7) + 1, index, week: Math.min(5, Math.floor(index / 7) + 1) }
  })
  const people = leftOn.map((day, index) => ({
    login: `p${String(index)}`,
    status: 'gone',
    leftBetween: [day, day],
  }))

  return { days, people } as unknown as DropoutReport
}

describe('abandono por días de piscina', () => {
  it('los exámenes son el 5, el 12, el 19 y el 26', () => {
    const exams = Array.from({ length: LAST_POOL_DAY }, (_, i) => i + 1).filter(isExamDay)

    expect(exams).toEqual([5, 12, 19, 26])
    expect(isExamDay(0)).toBe(false)
    expect(isExamDay(33)).toBe(true)
  })

  it('el eje va del día 1 al 26, no por fecha, con el acumulado', () => {
    // Una baja el día 5 de piscina (viernes 11) y otra el 12.
    const bars = departures(report(['2026-09-11', '2026-09-18']), 'gone', 'day')

    expect(bars.map((bar) => bar.poolDay)).toEqual(Array.from({ length: 26 }, (_, i) => i + 1))
    expect(bars[4]).toMatchObject({ poolDay: 5, count: 1, total: 1 })
    expect(bars.at(-1)).toMatchObject({ poolDay: 26, total: 2 })
    // Por semanas no hay día de piscina.
    expect(departures(report([]), 'gone', 'week').every((bar) => bar.poolDay === null)).toBe(true)
  })
})
