/**
 * Plazos por pace: del pace y el plazo que alguien anota salen todas sus fechas.
 */

import { describe, expect, it } from 'vitest'

import { daysBetween, deadlinesFor, originOf, paceOn, stepsFor } from '../src/shared/pace'

// Un caso real, contrastado con la intra: pace 15 y el círculo 3 vence el 11 de
// noviembre de 2026. La intra da el fin del common core el 27 de agosto de 2027.
const REF = { pace: 15, circle: 3, deadline: '2026-11-11' }
const ORIGIN = originOf(REF) ?? 0

/** Mediodía local de un día `YYYY-MM-DD`. */
const noon = (day: string): number => Date.parse(`${day}T12:00:00`)

/** `YYYY-MM-DD` de una fecha, en la hora local. */
function ymd(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

describe('pace', () => {
  it('el día cero es el plazo anotado menos los días de la tabla', () => {
    // 168 días antes del 11 de noviembre.
    expect(ymd(new Date(ORIGIN))).toBe('2026-05-27')
    expect(originOf({ ...REF, pace: 16 })).toBeNull()
    expect(originOf({ ...REF, circle: 7 })).toBeNull()
    expect(originOf({ ...REF, deadline: 'mañana' })).toBeNull()
  })

  it('da el calendario de caídas de un círculo, del pace más rápido al más lento', () => {
    const steps = stepsFor(ORIGIN, 3, noon('2026-10-12'))

    expect(steps.map((step) => step.pace)).toEqual([8, 12, 15, 18, 22, 24])
    expect(steps.map((step) => ymd(step.date))).toEqual([
      '2026-08-25',
      '2026-10-08',
      '2026-11-11',
      '2026-12-14',
      '2027-01-28',
      // El del pace más lento es el black hole de este círculo.
      '2027-03-29',
    ])
    expect(steps.map((step) => step.daysLeft)).toEqual([-48, -4, 30, 63, 108, 168])
  })

  it('un plazo vale hasta que acaba su día', () => {
    const [, , pace15] = stepsFor(ORIGIN, 3, Date.parse('2026-11-11T22:00:00'))

    expect(pace15?.daysLeft).toBe(0)
    expect(stepsFor(ORIGIN, 3, Date.parse('2026-11-12T01:00:00'))[2]?.daysLeft).toBe(-1)
  })

  it('el pace es el más rápido cuyo plazo aún no ha pasado', () => {
    expect(paceOn(ORIGIN, 3, noon('2026-08-25'))).toBe(8)
    expect(paceOn(ORIGIN, 3, noon('2026-08-26'))).toBe(12)
    expect(paceOn(ORIGIN, 3, noon('2026-11-11'))).toBe(15)
    expect(paceOn(ORIGIN, 3, noon('2027-03-29'))).toBe(24)
    // Pasado el del más lento, black hole.
    expect(paceOn(ORIGIN, 3, noon('2027-03-30'))).toBeNull()
  })

  it('da la fecha límite de cada círculo para un pace', () => {
    const deadlines = deadlinesFor(ORIGIN, 15, noon('2026-10-12'))

    expect(deadlines).toHaveLength(7)
    expect(deadlines.slice(3).map((deadline) => ymd(deadline.date))).toEqual([
      '2026-11-11',
      '2027-02-15',
      '2027-06-29',
      '2027-08-27',
    ])
  })

  it('cuenta días enteros entre dos momentos', () => {
    expect(daysBetween(noon('2026-05-18'), ORIGIN)).toBe(9)
    expect(daysBetween(noon('2026-05-27'), noon('2026-05-20'))).toBe(-7)
  })
})
