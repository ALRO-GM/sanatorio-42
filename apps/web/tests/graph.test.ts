/**
 * Tablón: cuánto de un círculo lleva aprobado cada persona.
 */

import { describe, expect, it } from 'vitest'

import type { GraphProject } from '@sanatorio/contracts'

import { completion } from '../src/features/doubts/graph'

let nextId = 1

const project = (overrides: Partial<GraphProject> = {}): GraphProject => ({
  projectId: nextId++,
  name: 'p',
  short: 'p',
  status: 'todo',
  perfect: false,
  hours: 10,
  series: null,
  choice: null,
  locked: false,
  signals: { unanswered: 0, proposals: 0, missingGuide: false },
  ...overrides,
})

describe('progreso de un círculo', () => {
  it('cuenta por horas', () => {
    expect(
      completion([project({ status: 'finished', hours: 30 }), project({ hours: 10 })]),
    ).toBeCloseTo(0.75)
  })

  it('del grupo de «elige uno» basta con uno: el círculo 2 puede llegar al 100 %', () => {
    const circle = [
      project({ status: 'finished', hours: 60 }), // push_swap
      project({ status: 'finished', choice: 'circle2-graphics', hours: 60 }), // so_long
      project({ choice: 'circle2-graphics', hours: 60 }), // FdF
      project({ choice: 'circle2-graphics', hours: 60 }), // fract-ol
      project({ status: 'finished', choice: 'circle2-unix', hours: 50 }), // minitalk
      project({ choice: 'circle2-unix', hours: 50 }), // pipex
    ]

    expect(completion(circle)).toBe(1)
  })

  it('un grupo pesa lo que su proyecto medio, y sin aprobar ninguno no suma', () => {
    const circle = [
      project({ status: 'finished', hours: 40 }),
      project({ choice: 'g', hours: 20 }),
      project({ choice: 'g', hours: 60 }),
    ]

    // 40 hechas de 40 + 40 (la media del grupo).
    expect(completion(circle)).toBeCloseTo(0.5)
  })

  it('sin horas cuentan como la media; sin proyectos, cero', () => {
    expect(
      completion([project({ status: 'finished', hours: null }), project({ hours: 20 })]),
    ).toBeCloseTo(0.5)
    expect(completion([project({ hours: null }), project({ hours: null })])).toBe(0)
    expect(completion([])).toBe(0)
  })

  it('aprobar dos del mismo grupo no pasa del 100 %', () => {
    expect(
      completion([
        project({ status: 'finished', choice: 'g' }),
        project({ status: 'finished', choice: 'g' }),
      ]),
    ).toBe(1)
  })
})
