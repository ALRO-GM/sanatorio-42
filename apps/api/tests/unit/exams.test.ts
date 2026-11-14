import { describe, expect, it } from 'vitest'

import {
  BLACKHOLE_LIST_MAX,
  blackholeByCircle,
  blackholeLists,
  circleDurations,
  examMeta,
  examPeople,
  examStat,
  kickoffsOf,
  selectPeople,
  sessionResult,
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

  it('un equipo abierto y vacío no es un intento: no corre la cuenta (#117)', () => {
    const open = { userId: 2, projectId: 1, mark: null, validated: null, at: '2026-11-12T12:14' }
    const stat = examStat(exam, [
      attempt(2, '2026-11-12T12:00', 75, false),
      // 42 lo abre nada más cerrar el anterior, para la vez siguiente.
      open,
      attempt(2, '2026-11-14T12:00', 100, true),
    ])

    // Aprueba al 2.º intento, no al 3.º; y nadie hizo un 3.º.
    expect(stat).toMatchObject({ people: 1, passed: 1, attemptsToPass: [0, 1] })
    expect(stat.byAttempt.map((one) => one.attempt)).toEqual([1, 2])
    // Solo con el abierto, la persona no tiene intentos (cuenta por su fila, si la hay).
    expect(examStat(exam, [open])).toMatchObject({ people: 0, byAttempt: [] })
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
const NOW = Date.parse('2026-11-14T12:00:00Z')
const DAY = 86_400_000
const member = (userId: number, extra: Partial<MemberRow> = {}): MemberRow => ({
  userId,
  login: `p${userId}`,
  image: null,
  beginAt: null,
  track: null,
  ranks: null,
  cursus: null,
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
  status: 'unknown',
  endAt: null,
  blackholedAt: null,
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
      now: NOW,
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
      now: NOW,
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

describe('lo que sacó alguien en una sesión de examen (#117)', () => {
  const closed = (mark: number, validated: boolean, projectId = 1) => ({
    projectId,
    mark,
    validated,
  })
  const open = (mark: number | null = null, projectId = 1) => ({
    projectId,
    mark,
    validated: null,
  })

  it('un 75 cerrado no lo tapa el equipo vacío que 42 abre después', () => {
    expect(sessionResult([closed(75, false), open()])).toEqual({
      projectId: 1,
      mark: 75,
      passed: false,
      closed: true,
    })
  })

  it('sin cerrar aún, cuenta el abierto con la nota que lleve', () => {
    expect(sessionResult([open(50)])).toEqual({
      projectId: 1,
      mark: 50,
      passed: false,
      closed: false,
    })
    expect(sessionResult([open()])).toMatchObject({ mark: null, closed: false })
  })

  it('sin intentos, nada', () => {
    expect(sessionResult([])).toBeUndefined()
  })

  it('con varios cerrados, la mejor nota y aprobado si alguno aprobó; manda el examen del último', () => {
    expect(sessionResult([closed(25, false, 1), closed(100, true, 2), open(null, 3)])).toEqual({
      projectId: 2,
      mark: 100,
      passed: true,
      closed: true,
    })
  })

  it('muchos intentos raros a la vez no rompen la cuenta', () => {
    const many = Array.from({ length: 5_000 }, (_, index) =>
      index % 2 === 0 ? open(index % 7 === 0 ? null : 10) : closed(index % 101, false),
    )

    expect(sessionResult(many)).toMatchObject({ mark: 100, passed: false, closed: true })
  })
})

describe('el black hole por círculos y su historial (#81)', () => {
  /** Su 42cursus: echado hace `daysAgo` días, o activo con la fecha en `daysAhead`. */
  const cursus = (
    extra: Partial<NonNullable<MemberRow['cursus']>> = {},
  ): NonNullable<MemberRow['cursus']> => ({
    beginAt: '2025-10-06T08:00:00Z',
    endAt: null,
    blackholedAt: null,
    grade: 'Cadet',
    active: true,
    alumni: false,
    ...extra,
  })
  const gone = (daysAgo: number) =>
    cursus({ endAt: new Date(NOW - daysAgo * DAY).toISOString(), active: false })
  const soon = (daysAhead: number) =>
    cursus({ blackholedAt: new Date(NOW + daysAhead * DAY).toISOString() })

  it('quien solo tiene su 42cursus sale, con su kickoff y cómo acabó', () => {
    const people = examPeople({
      members: [
        // Ni entró en la web ni tiene proyectos copiados: antes no salía.
        member(1, { cursus: gone(60), ranks: ['2025-10-20'], track: 'classic' }),
        member(2, { cursus: soon(10) }),
        // Echado hace poco: aún puede ser un error del staff, no se sabe.
        member(3, { cursus: gone(5) }),
        member(4),
      ],
      rows: [],
      circles,
      examUsers: new Set(),
      now: NOW,
    })

    expect(people.map((one) => [one.userId, one.kickoff, one.status])).toEqual([
      [1, '2025-10', 'blackholed'],
      [2, '2025-10', 'active'],
      [3, '2025-10', 'unknown'],
    ])
  })

  it('cuenta en cada círculo quién llegó y a quién se tragó, sin la gente en duda', () => {
    const stats = blackholeByCircle([
      person({ userId: 1, status: 'blackholed', ranks: [] }),
      person({ userId: 2, status: 'blackholed', projectCircle: 2 }),
      person({ userId: 3, status: 'active', ranks: ['a', 'b', 'c'] }),
      person({ userId: 4, status: 'finished' }),
      person({ userId: 5, status: 'unknown', projectCircle: 1 }),
      // Sin ningún proyecto del common core: se quedó en el 0.
      person({ userId: 6, status: 'blackholed' }),
    ])

    expect(stats[0]).toEqual({ circle: 0, reached: 5, absorbed: 2 })
    expect(stats[2]).toEqual({ circle: 2, reached: 3, absorbed: 1 })
    expect(stats[3]).toEqual({ circle: 3, reached: 2, absorbed: 0 })
    expect(stats.at(-1)).toEqual({ circle: 6, reached: 1, absorbed: 0 })
  })

  it('sin nadie de quien se sepa, ningún círculo', () => {
    expect(blackholeByCircle([])).toEqual([])
    expect(blackholeByCircle([person({ status: 'unknown', projectCircle: 3 })])).toEqual([])
    expect(blackholeLists([], NOW)).toEqual({ absorbed: [], closest: [] })
  })

  it('el historial: lo más reciente primero; los más cercanos, solo con la fecha por llegar', () => {
    const lists = blackholeLists(
      [
        person({ login: 'viejo', status: 'blackholed', endAt: '2025-01-01T00:00:00Z' }),
        person({ login: 'nuevo', status: 'blackholed', endAt: '2026-09-01T00:00:00Z' }),
        person({ login: 'lejos', status: 'active', blackholedAt: '2027-05-01T00:00:00Z' }),
        person({ login: 'cerca', status: 'active', blackholedAt: '2026-11-20T00:00:00Z' }),
        // Fecha ya pasada y sigue: la fecha de 42 no dice nada (días extra).
        person({ login: 'pasada', status: 'active', blackholedAt: '2026-01-01T00:00:00Z' }),
        person({ login: 'duda', status: 'unknown', blackholedAt: '2026-12-01T00:00:00Z' }),
      ],
      NOW,
    )

    expect(lists.absorbed.map((one) => one.login)).toEqual(['nuevo', 'viejo'])
    expect(lists.closest.map((one) => one.login)).toEqual(['cerca', 'lejos'])
  })

  it('con muchísima gente, cada lista se corta y las cuentas no se rompen', () => {
    const many = Array.from({ length: 5_000 }, (_, index) =>
      person({
        userId: index,
        login: `p${String(index)}`,
        status: index % 2 === 0 ? 'blackholed' : 'active',
        endAt: new Date(NOW - index * DAY).toISOString(),
        blackholedAt: new Date(NOW + (index + 1) * DAY).toISOString(),
        projectCircle: index % 7,
      }),
    )
    const lists = blackholeLists(many, NOW)

    expect(lists.absorbed).toHaveLength(BLACKHOLE_LIST_MAX)
    expect(lists.closest[0]?.login).toBe('p1')
    expect(blackholeByCircle(many)[0]).toMatchObject({ reached: 5_000 })
  })

  it('sin cuentas anonimizadas ni quien no se ve, y el tope se cuenta después de quitarlas', () => {
    const gone = (login: string, index: number): ExamPerson =>
      person({
        userId: index,
        login,
        status: 'blackholed',
        endAt: new Date(NOW - index * DAY).toISOString(),
      })
    // Los más recientes son de quien no puede salir: aun así, la lista se llena.
    const hiddenFirst = [
      ...Array.from({ length: 50 }, (_, index) => gone(`anon-${String(index)}`, index)),
      ...Array.from({ length: 50 }, (_, index) => gone(`pisci${String(index)}`, 50 + index)),
      ...Array.from({ length: BLACKHOLE_LIST_MAX + 10 }, (_, index) =>
        gone(`p${String(index)}`, 100 + index),
      ),
    ]
    const lists = blackholeLists(hiddenFirst, NOW, (login) => !login.startsWith('pisci'))

    expect(lists.absorbed).toHaveLength(BLACKHOLE_LIST_MAX)
    expect(lists.absorbed[0]?.login).toBe('p0')
    expect(lists.absorbed.some((one) => /^(anon-|pisci)/.test(one.login))).toBe(false)
    // Un alias en mayúsculas tampoco se cuela.
    expect(blackholeLists([gone('ANON-ab12', 1)], NOW).absorbed).toEqual([])
  })
})
