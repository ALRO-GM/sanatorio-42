import { describe, expect, it } from 'vitest'

import {
  blackHoleStats,
  circleAt,
  circleDurations,
  examMeta,
  examPeople,
  examStat,
  kickoffRows,
  kickoffsOf,
  MIN_KICKOFF,
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
    expect(stat.byAttempt[0]).toMatchObject({ attempt: 1, people: 3, avgMark: 40 })
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

const NOW = Date.parse('2026-10-22T12:00:00Z')
const DAY = 86_400_000
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
  blackholedAt: null,
  asked: false,
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
  asked: true,
  blackHole: null,
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

  it('un black hole pasado con proyectos cambiados después es viejo: no cuenta', () => {
    const people = examPeople({
      members: [
        member(1, { blackholedAt: '2026-01-01T00:00:00Z', asked: true }),
        member(2, { blackholedAt: '2026-01-01T00:00:00Z', asked: true }),
      ],
      rows: [
        row(1, 10, { createdAt: '2025-06-01T00:00:00Z', updatedAt: '2026-04-01T00:00:00Z' }),
        // El mismo día del black hole: aún vale.
        row(2, 10, { createdAt: '2025-06-01T00:00:00Z', updatedAt: '2026-01-01T12:00:00Z' }),
      ],
      circles,
      examUsers: new Set(),
    })

    expect(people.map((one) => one.blackHole)).toEqual([null, Date.parse('2026-01-01T00:00:00Z')])
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

  it('compara kickoffs: quién intentó y aprobó cada examen y cuántos absorbió el black hole', () => {
    const many = Array.from({ length: MIN_KICKOFF }, (_, index) =>
      person({ userId: 10 + index, kickoff: '2025-10', blackHole: index === 0 ? NOW - DAY : null }),
    )
    const rows = kickoffRows({
      people: [...many, person({ userId: 1, kickoff: '2026-03', asked: false })],
      chosen: [],
      exams: [{ id: 1 }],
      attempts: [attempt(10, '2026-01-01', 0, false), attempt(10, '2026-02-01', 100, true)],
      occurrences: [{ userId: 11, projectId: 1, validated: false, occurrence: 2 }],
      now: NOW,
    })

    // Sin elegir, solo las kickoffs con gente suficiente.
    expect(rows).toEqual([
      {
        month: '2025-10',
        people: MIN_KICKOFF,
        exams: [{ projectId: 1, people: 2, passed: 1 }],
        known: MIN_KICKOFF,
        absorbed: 1,
      },
    ])

    // Elegidas, salen aunque sean pequeñas o no tengan a nadie.
    const chosen = kickoffRows({
      people: [person({ userId: 1, kickoff: '2026-03' })],
      chosen: ['2026-03', '2020-01', '2026-03'],
      exams: [{ id: 1 }],
      attempts: [],
      occurrences: [],
      now: NOW,
    })

    expect(chosen.map((one) => [one.month, one.people])).toEqual([
      ['2026-03', 1],
      ['2020-01', 0],
    ])
  })
})

describe('black hole', () => {
  it('el círculo en un momento sale de los hitos o, sin ellos, de los proyectos', () => {
    const ranks = ['2026-01-10T00:00:00Z', '2026-03-10T00:00:00Z']

    expect(circleAt(person({ ranks }), Date.parse('2026-01-09T00:00:00Z'))).toBe(0)
    expect(circleAt(person({ ranks }), Date.parse('2026-01-10T00:00:00Z'))).toBe(1)
    expect(circleAt(person({ ranks }), NOW)).toBe(2)
    expect(circleAt(person({ projectCircle: 3 }), NOW)).toBe(3)
    expect(circleAt(person({}), NOW)).toBeNull()
    // Con todo validado no pasa del último círculo.
    expect(circleAt(person({ ranks: Array.from({ length: 9 }, () => ranks[0] ?? '') }), NOW)).toBe(
      6,
    )
  })

  it('por círculo, de los que llegaron a él; por mes; los últimos y los más cerca', () => {
    const stats = blackHoleStats(
      [
        // Absorbida en el círculo 1 (había validado el 0).
        person({
          userId: 1,
          login: 'ana',
          ranks: ['2026-01-01T00:00:00Z', '2026-09-01T00:00:00Z'],
          blackHole: Date.parse('2026-05-01T00:00:00Z'),
        }),
        // Absorbida en el 0, sin hitos ni proyectos de círculo: no cuenta por círculo.
        person({ userId: 2, login: 'leo', blackHole: Date.parse('2026-05-20T00:00:00Z') }),
        // Va por el 2 y tiene el black hole en 5 días.
        person({ userId: 3, login: 'sol', projectCircle: 2, blackHole: NOW + 5 * DAY }),
        // En 60 días.
        person({ userId: 4, login: 'eva', projectCircle: 0, blackHole: NOW + 60 * DAY }),
        // Justo ahora: ya ha caído.
        person({ userId: 5, login: 'max', projectCircle: 1, blackHole: NOW }),
        // No se le ha preguntado a 42: no cuenta para nada.
        person({ userId: 6, asked: false, projectCircle: 1, blackHole: NOW - DAY }),
      ],
      NOW,
    )

    expect(stats).toMatchObject({ known: 5, absorbed: 3 })
    expect(stats.circles).toEqual([
      { circle: 0, reached: 4, absorbed: 0 },
      { circle: 1, reached: 3, absorbed: 2 },
      { circle: 2, reached: 1, absorbed: 0 },
    ])
    expect(stats.months).toEqual([
      { month: '2026-05', absorbed: 2 },
      { month: '2026-10', absorbed: 1 },
    ])
    expect(stats.soon).toEqual([
      { days: 7, people: 1 },
      { days: 30, people: 1 },
      { days: 90, people: 2 },
    ])
    expect(stats.recent.map((one) => one.login)).toEqual(['max', 'leo', 'ana'])
    expect(stats.recent[2]).toMatchObject({ circle: 1, at: '2026-05-01T00:00:00.000Z' })
    expect(stats.closest.map((one) => [one.login, one.circle])).toEqual([
      ['sol', 2],
      ['eva', 0],
    ])
  })

  it('sin nadie, todo a cero; con mucha gente, las listas tienen tope', () => {
    expect(blackHoleStats([], NOW)).toEqual({
      known: 0,
      absorbed: 0,
      circles: [],
      months: [],
      soon: [
        { days: 7, people: 0 },
        { days: 30, people: 0 },
        { days: 90, people: 0 },
      ],
      recent: [],
      closest: [],
    })

    const crowd = Array.from({ length: 2000 }, (_, index) =>
      person({ userId: index, blackHole: NOW + (index - 1000) * DAY }),
    )
    const stats = blackHoleStats(crowd, NOW)

    expect(stats.recent).toHaveLength(50)
    expect(stats.closest).toHaveLength(20)
    expect(stats.absorbed).toBe(1001)
  })
})
