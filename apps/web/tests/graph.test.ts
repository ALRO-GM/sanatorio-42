/**
 * Tablón: cuánto de un círculo lleva aprobado cada persona.
 */

import { describe, expect, it } from 'vitest'

import type { GraphProject } from '@sanatorio/contracts'

import { completion } from '../src/features/doubts/graph'
import { correctionRings, tierCounts, tierOf } from '../src/features/doubts/corrections'

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
  corrected: 0,
  retired: false,
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

describe('el grafo de correcciones', () => {
  it('da un grado por las veces: 1, 3, 5 y 10', () => {
    expect([0, 1, 2, 3, 4, 5, 9, 10, 40].map(tierOf)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4])
  })

  it('deja fuera los retirados que no corregiste, y marca lo que aún no has aprobado', () => {
    const graph = {
      track: 'classic' as const,
      level: null,
      startedAt: null,
      currentCircle: 2,
      knownUpTo: 1,
      circles: [
        {
          circle: 0,
          projects: [
            project({ name: 'Libft', status: 'finished', corrected: 12 }),
            project({ name: 'viejo', status: 'finished', retired: true }),
            project({ name: 'viejo pero tuyo', status: 'finished', retired: true, corrected: 2 }),
          ],
        },
        { circle: 1, projects: [project({ name: 'nuevo', status: 'in_progress' })] },
      ],
    }
    const rings = correctionRings(graph)

    expect(
      rings.map((ring) => ring.projects.map((one) => [one.name, one.tier, one.future])),
    ).toEqual([
      [
        ['Libft', 4, false],
        ['viejo pero tuyo', 1, false],
      ],
      [['nuevo', 0, true]],
    ])
    expect(tierCounts(graph)).toEqual([2, 1, 1, 1])
  })
})
