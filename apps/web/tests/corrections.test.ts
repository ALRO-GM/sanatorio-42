/**
 * El álbum de correcciones (`docs/correcciones-coleccion.md`): qué es un
 * cromo, qué falta, las colecciones, la rareza y los siguientes objetivos.
 */

import { describe, expect, it } from 'vitest'

import type { CollectionRarity, GraphProject, HolyGraph } from '@sanatorio/contracts'

import {
  albumOf,
  goalsOf,
  isExam,
  newlyComplete,
  progressOf,
  rarityTierOf,
  tierOf,
  toNextTier,
} from '../src/features/doubts/corrections'

const BASE: Omit<GraphProject, 'projectId' | 'name'> = {
  short: 'p',
  status: 'finished',
  perfect: false,
  hours: null,
  series: null,
  choice: null,
  locked: false,
  corrected: 0,
  retired: false,
  signals: { unanswered: 0, proposals: 0, missingGuide: false },
  group: null,
}

let id = 100

const card = (name: string, extra: Partial<GraphProject> = {}): GraphProject => ({
  ...BASE,
  projectId: id++,
  name,
  short: name,
  ...extra,
})

const graphOf = (...circles: GraphProject[][]): HolyGraph => ({
  kind: 'core',
  track: 'classic',
  level: null,
  startedAt: null,
  currentCircle: 1,
  knownUpTo: circles.length - 1,
  circles: circles.map((projects, circle) => ({ circle, projects })),
})

const rare = (projectId: number, share: number, eligible = 50): CollectionRarity => ({
  projectId,
  eligible,
  holders: Math.round(share * eligible),
  share,
})

describe('niveles de un cromo', () => {
  it('sube en 1, 3, 5 y 10 correcciones, y dice cuánto falta', () => {
    expect([0, 1, 2, 3, 4, 5, 9, 10, 40].map(tierOf)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4])
    expect([0, 1, 2, 4, 9, 10, 99].map(toNextTier)).toEqual([1, 2, 1, 1, 1, null, null])
  })
})

describe('el álbum', () => {
  it('separa conseguidos, huecos y candados; los retirados sin corregir y los exámenes no salen', () => {
    const sets = albumOf(
      graphOf(
        [
          card('Libft', { corrected: 12 }),
          card('viejo', { retired: true }),
          card('viejo pero tuyo', { retired: true, corrected: 2 }),
        ],
        [
          card('B2BR'),
          card('printf', { status: 'in_progress' }),
          card('Exam Rank 02', { corrected: 0 }),
          card('retirado sin hacer', { status: 'todo', retired: true }),
        ],
      ),
    )

    expect(sets.map((set) => set.cards.map((one) => [one.name, one.state, one.tier]))).toEqual([
      [
        ['Libft', 'owned', 4],
        ['viejo pero tuyo', 'owned', 1],
      ],
      [
        ['B2BR', 'missing', 0],
        ['printf', 'locked', 0],
      ],
    ])
    expect(sets.map((set) => [set.owned, set.total, set.complete])).toEqual([
      [2, 2, true],
      [0, 1, false],
    ])
    expect(progressOf(sets)).toEqual({
      owned: 2,
      total: 3,
      share: 2 / 3,
      completeSets: 1,
      sets: 2,
      tiers: [2, 1, 1, 1],
    })
  })

  it('un álbum vacío no divide por cero ni enseña colecciones vacías', () => {
    const sets = albumOf(graphOf([], [card('x', { status: 'todo' })]))

    expect(sets).toHaveLength(1)
    expect(sets[0]?.complete).toBe(false)
    expect(progressOf([])).toEqual(
      expect.objectContaining({ owned: 0, total: 0, share: 0, sets: 0 }),
    )
  })

  it('en la piscina, los exámenes no son cromos', () => {
    expect(isExam({ name: 'C Piscine Exam 00', group: 'exam' })).toBe(true)
    expect(isExam({ name: 'Exam Rank 03', group: null })).toBe(true)
    expect(isExam({ name: 'Examshell trainer', group: null })).toBe(false)
    expect(isExam({ name: 'C Piscine C 00', group: 'c' })).toBe(false)
  })
})

describe('rareza', () => {
  it('va de común a legendario y no dice nada con poca gente', () => {
    expect([0.8, 0.5, 0.3, 0.12, 0.05].map((share) => rarityTierOf(rare(1, share)))).toEqual([
      'common',
      'common',
      'uncommon',
      'rare',
      'legendary',
    ])
    expect(rarityTierOf(rare(1, 0.01, 4))).toBeNull()
    expect(rarityTierOf(undefined)).toBeNull()
  })
})

describe('siguientes objetivos', () => {
  it('propone la colección a la que menos le falta, el hueco más raro y el nivel más cercano', () => {
    const a = card('a', { corrected: 4 })
    const b = card('b')
    const c = card('c')
    const d = card('d')
    const e = card('e', { corrected: 1 })
    const sets = albumOf(graphOf([a, b, c], [d, e]))
    const goals = goalsOf(sets, [
      rare(b.projectId, 0.6),
      rare(c.projectId, 0.07),
      rare(d.projectId, 0.4),
    ])

    // El círculo 1 tiene un hueco (d); el 0, dos.
    expect(goals.closestSet?.circle).toBe(1)
    expect(goals.closestSet?.missing.map((one) => one.name)).toEqual(['d'])
    expect([goals.rarest?.card.name, goals.rarest?.share]).toEqual(['c', 0.07])
    // a lleva 4 (le falta 1 para oro); e, 1 (le faltan 2 para plata).
    expect([goals.nextLevel?.card.name, goals.nextLevel?.needed]).toEqual(['a', 1])
  })

  it('sin rareza ni huecos no inventa nada', () => {
    const sets = albumOf(graphOf([card('a', { corrected: 10 })]))

    expect(goalsOf(sets)).toEqual({ closestSet: null, rarest: null, nextLevel: null })
    expect(goalsOf([])).toEqual({ closestSet: null, rarest: null, nextLevel: null })
  })

  it('no propone como el más raro uno con muy poca gente', () => {
    const b = card('b')
    const sets = albumOf(graphOf([b]))

    expect(goalsOf(sets, [rare(b.projectId, 0.01, 2)]).rarest).toBeNull()
  })
})

describe('celebrar una colección', () => {
  it('solo las recién completadas, y nada la primera vez', () => {
    const sets = albumOf(graphOf([card('a', { corrected: 1 })], [card('b', { corrected: 3 })]))

    expect(newlyComplete(sets, null)).toEqual([])
    expect(newlyComplete(sets, [0])).toEqual([1])
    expect(newlyComplete(sets, [0, 1])).toEqual([])
  })

  it('aguanta un álbum enorme', () => {
    const many = Array.from({ length: 2000 }, (_, index) =>
      card(`p${String(index)}`, { corrected: index % 3 }),
    )
    const progress = progressOf(albumOf(graphOf(many)))

    expect(progress.total).toBe(2000)
    expect(progress.owned).toBe(1333)
  })
})
