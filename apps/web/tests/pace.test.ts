/**
 * Plazos por pace: a qué ritmo se queda alguien según cuándo termina un círculo.
 */

import { describe, expect, it } from 'vitest'

import { daysBetween, deadlinesFor, paceOn, stepsFor } from '../src/shared/pace'

const START = '2026-05-18T07:42:00.000Z'
const DAY = 24 * 60 * 60_000
const at = (days: number): number => Date.parse(START) + days * DAY

describe('pace', () => {
  it('el pace es el más rápido cuyo plazo aún no ha pasado', () => {
    // Círculo 3: 90 / 134 / 168 / 201 / 246 / 306 días.
    expect(paceOn(START, 3, at(90))).toBe(8)
    expect(paceOn(START, 3, at(91))).toBe(12)
    expect(paceOn(START, 3, at(146))).toBe(15)
    expect(paceOn(START, 3, at(306))).toBe(24)
    // Pasado el del más lento, black hole.
    expect(paceOn(START, 3, at(307))).toBeNull()
  })

  it('los días extra retrasan todos los plazos', () => {
    expect(paceOn(START, 3, at(146), 14)).toBe(12)
    expect(paceOn(START, 3, at(320), 14)).toBe(24)
    expect(paceOn(START, 3, at(321), 14)).toBeNull()
  })

  it('da el calendario de caídas de un círculo, del pace más rápido al más lento', () => {
    const steps = stepsFor(START, 3, at(146))

    expect(steps.map((step) => step.pace)).toEqual([8, 12, 15, 18, 22, 24])
    expect(steps.map((step) => step.daysLeft)).toEqual([-56, -12, 22, 55, 100, 160])
    expect(steps[2]?.date.toISOString()).toBe('2026-11-02T07:42:00.000Z')
    // Con 14 días extra, el pace 12 vuelve a estar al alcance.
    expect(stepsFor(START, 3, at(146), 14).map((step) => step.daysLeft)[1]).toBe(2)
  })

  it('da la fecha límite de cada círculo para un pace', () => {
    const deadlines = deadlinesFor(START, 15, at(100))

    expect(deadlines).toHaveLength(7)
    expect(deadlines.map((deadline) => deadline.daysLeft)).toEqual([-82, -40, 1, 68, 164, 298, 357])
  })

  it('cuenta días enteros entre dos momentos', () => {
    expect(daysBetween(at(0), at(320))).toBe(320)
    expect(daysBetween(at(10), at(3))).toBe(-7)
  })
})
