import { describe, expect, it } from 'vitest'

import {
  circleDurations,
  examMeta,
  examPeople,
  examStat,
  kickoffsOf,
  selectPeople,
} from '../../src/modules/exams/exams.rules.js'
import type { ExamPerson, MemberRow, PlanRow } from '../../src/modules/exams/exams.rules.js'

const exam = { id: 1, name: 'Exam Rank 02', slug: 'exam-rank-02' }
const attempt = (userId: number, at: string, mark: number, validated: boolean) => ({
  userId,
  projectId: 1,
  mark,
  validated,
  at,
})

describe('estadísticas de exámenes', () => {
  it('cuenta los intentos hasta el primer aprobado y la nota de cada intento', () => {
    const stat = examStat(exam, [
      // 1 aprueba a la primera; 2, a la tercera; 3 aún no.
      attempt(1, '2026-01-01', 100, true),
      attempt(2, '2026-01-01', 0, false),
      attempt(2, '2026-02-01', 40, false),
      attempt(2, '2026-03-01', 80, true),
      attempt(3, '2026-01-01', 20, false),
      // Un intento de otro examen no cuenta.
      { ...attempt(4, '2026-01-01', 100, true), projectId: 9 },
    ])

    expect(stat).toMatchObject({ people: 3, passed: 2, avgAttempts: 2, family: 'classic', rank: 2 })
    expect(stat.attemptsToPass).toEqual([1, 0, 1])
    expect(stat.byAttempt[0]).toMatchObject({ attempt: 1, people: 3, medianMark: 20 })
    expect(stat.byAttempt[0]?.passRate).toBeCloseTo(1 / 3)
    expect(stat.byAttempt.at(-1)).toMatchObject({ attempt: 3, people: 1, passRate: 1 })
  })

  it('sin tope de intentos: quien aprueba al 9.º sale en el 9.º, y los 9 intentos se ven', () => {
    const tries = Array.from({ length: 9 }, (_, index) =>
      attempt(1, `2026-0${index + 1}-01`, index === 8 ? 100 : 10, index === 8),
    )
    const stat = examStat(exam, tries)

    expect(stat.attemptsToPass).toHaveLength(9)
    expect(stat.attemptsToPass[8]).toBe(1)
    expect(stat.byAttempt).toHaveLength(9)
  })

  it('sin intentos guardados, cuenta por los reintentos; sin reintentos, aprueba igual', () => {
    const stat = examStat(
      exam,
      [attempt(1, '2026-01-01', 100, true)],
      [
        // Ya contada por sus intentos: no se repite.
        { userId: 1, projectId: 1, validated: true, occurrence: 4 },
        { userId: 5, projectId: 1, validated: true, occurrence: 5 },
        { userId: 6, projectId: 1, validated: false, occurrence: 1 },
        // Fila antigua sin reintentos: antes no contaba como aprobada.
        { userId: 7, projectId: 1, validated: true, occurrence: null },
      ],
    )

    expect(stat).toMatchObject({ people: 4, passed: 3, attemptsToPass: [1, 0, 0, 0, 0, 1] })
    expect(stat.avgAttempts).toBe(3.5)
  })

  it('sin nada, ni aprobados ni intentos', () => {
    expect(examStat(exam, [])).toMatchObject({
      people: 0,
      passed: 0,
      avgAttempts: null,
      attemptsToPass: [],
      byAttempt: [],
    })
  })

  it('distingue los de C de los de Nexus por el slug', () => {
    expect(examMeta('42next-exam-rank-03')).toEqual({ family: 'next', rank: 3 })
    expect(examMeta('exam-rank-06')).toEqual({ family: 'classic', rank: 6 })
    expect(examMeta('exam-atonement')).toEqual({ family: 'classic', rank: null })
  })

  it('la duración de los círculos, sin casos extremos', () => {
    const person = (begin: string, ...ranks: string[]) => ({ begin, ranks })
    const durations = circleDurations([
      person('2026-01-01', '2026-01-11', '2026-02-10'),
      person('2026-01-01', '2026-01-21', '2026-02-20'),
      person('2026-01-01', '2026-01-16', '2026-02-15'),
      person('2026-01-01', '2026-01-13'),
      // Un caso extremo: un año para el primero.
      person('2025-01-01', '2026-01-01'),
    ])

    // 10, 12, 15 y 20 días: la mediana, 13,5, redondeada.
    expect(durations[0]).toMatchObject({ circle: 0, people: 4, median: 14 })
    expect(durations[1]).toMatchObject({ circle: 1, people: 3, median: 30 })
  })
})

/** Libft (círculo 0) y un proyecto del círculo 2, en cada plan. */
const circles = {
  classic: new Map([
    [10, 0],
    [12, 2],
  ]),
  next: new Map([
    [20, 0],
    [22, 2],
  ]),
}
const member = (userId: number, extra: Partial<MemberRow> = {}): MemberRow => ({
  userId,
  login: `p${userId}`,
  image: null,
  beginAt: null,
  track: null,
  ranks: null,
  ...extra,
})
const row = (userId: number, projectId: number, extra: Partial<PlanRow> = {}): PlanRow => ({
  userId,
  projectId,
  createdAt: null,
  updatedAt: null,
  slug: '',
  ...extra,
})
const person = (extra: Partial<ExamPerson>): ExamPerson => ({
  userId: 1,
  login: 'p1',
  image: null,
  track: 'classic',
  kickoff: '2025-10',
  start: null,
  ranks: null,
  projectCircle: null,
  ...extra,
})

describe('kickoffs y planes', () => {
  it('la kickoff es el mes de inicio o, sin él, el del primer proyecto del common core', () => {
    const people = examPeople({
      members: [
        member(1, { beginAt: '2025-10-06T08:00:00Z' }),
        member(2),
        member(3),
        // Sin proyectos ni exámenes: no está en el common core.
        member(4),
        // Sin kickoff, pero con exámenes: sale igual.
        member(5),
      ],
      rows: [
        row(1, 10, { createdAt: '2024-01-01T00:00:00Z' }),
        // Sin fecha de apuntarse: vale la última vez que cambió.
        row(2, 10, { updatedAt: '2026-03-02T00:00:00Z' }),
        row(2, 12, { createdAt: '2026-05-01T00:00:00Z' }),
        // Un proyecto que no es del common core no cuenta para la kickoff.
        row(3, 99, { createdAt: '2020-01-01T00:00:00Z' }),
        row(3, 20, { createdAt: '2026-02-28T23:59:59Z', slug: '42next-libft' }),
      ],
      circles,
      examUsers: new Set([5]),
    })

    expect(people.map((one) => [one.userId, one.kickoff, one.track])).toEqual([
      [1, '2025-10', 'classic'],
      [2, '2026-03', 'classic'],
      // Su proyecto de 42next dice que es del plan nuevo.
      [3, '2026-02', 'next'],
      [5, null, 'classic'],
    ])
    expect(people[1]?.projectCircle).toBe(2)
  })

  it('el plan guardado manda sobre lo que digan sus proyectos', () => {
    const [one] = examPeople({
      members: [member(1, { track: 'classic', ranks: [] })],
      rows: [row(1, 20, { createdAt: '2026-01-01T00:00:00Z', slug: 'python-module-00' })],
      circles,
      examUsers: new Set(),
    })

    expect(one?.track).toBe('classic')
  })

  it('elige por plan y por kickoffs, y lista todas las kickoffs con su gente de cada plan', () => {
    const people = [
      person({ userId: 1, kickoff: '2025-10' }),
      person({ userId: 2, kickoff: '2025-10', track: 'next' }),
      person({ userId: 3, kickoff: '2026-03', track: 'next' }),
      person({ userId: 4, kickoff: null }),
    ]

    expect(kickoffsOf(people)).toEqual([
      { month: '2026-03', classic: 0, next: 1 },
      { month: '2025-10', classic: 1, next: 1 },
    ])
    expect(selectPeople(people, { track: 'all', kickoffs: [] })).toHaveLength(4)
    expect(selectPeople(people, { track: 'next', kickoffs: [] }).map((p) => p.userId)).toEqual([
      2, 3,
    ])
    expect(
      selectPeople(people, { track: 'all', kickoffs: ['2025-10'] }).map((p) => p.userId),
    ).toEqual([1, 2])
    expect(selectPeople(people, { track: 'classic', kickoffs: ['2030-01'] })).toEqual([])
  })
})
