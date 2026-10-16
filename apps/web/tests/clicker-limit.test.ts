import { describe, expect, it } from 'vitest'

import type { Health } from '@sanatorio/contracts'

import { addPlayed, playedToday, riskyPace } from '../src/features/clicker/limit'
import { originOf, stepsFor } from '../src/shared/pace'

const memory = () => {
  const saved = new Map<string, string>()

  return {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => {
      saved.set(key, value)
    },
  }
}

describe('el tope de juego con el pace en riesgo', () => {
  const declared = {
    pace: 12,
    circle: 2,
    deadline: '2026-12-01',
    updatedAt: '2026-10-01T00:00:00.000Z',
  }
  const health = (circle: number): Health => ({
    startedAt: '2026-01-01T00:00:00.000Z',
    blackholedAt: null,
    declared,
    currentCircle: circle,
    milestones: [],
  })
  const origin = originOf(declared) ?? 0
  /** El día en que, en el círculo 2, ya solo quedaría ese pace. */
  const whenOnly = (pace: number): number => {
    const steps = stepsFor(origin, 2, 0)
    const before = steps[steps.findIndex((step) => step.pace === pace) - 1]

    return (before?.date.getTime() ?? 0) + 2 * 86_400_000
  }

  it('solo hay tope si hoy irías a pace 22 o más, o al black hole', () => {
    expect(riskyPace(health(2), origin)).toBeNull()
    expect(riskyPace(health(2), whenOnly(22))).toBe(22)
    expect(riskyPace(health(2), whenOnly(24))).toBe(24)
    expect(riskyPace(health(2), origin + 5000 * 86_400_000)).toBe(0)
    // Sin pace anotado, no se sabe: no hay tope.
    expect(riskyPace({ ...health(2), declared: null }, whenOnly(24))).toBeNull()
  })

  it('cuenta lo jugado hoy y empieza de cero al día siguiente', () => {
    const store = memory()
    const now = new Date(2026, 9, 16, 12).getTime()

    expect(playedToday(now, store)).toBe(0)
    addPlayed(60, now, store)
    expect(addPlayed(30, now + 1000, store)).toBe(90)
    expect(playedToday(now + 86_400_000, store)).toBe(0)
  })
})
