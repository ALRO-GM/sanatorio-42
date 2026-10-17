import { describe, expect, it } from 'vitest'

import { circleDurations, examStat } from '../../src/modules/exams/exams.rules.js'

const exam = { id: 1, name: 'Exam Rank 02' }
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

    expect(stat).toMatchObject({ people: 3, passed: 2, avgAttempts: 2 })
    expect(stat.attemptsToPass).toEqual([1, 0, 1, 0, 0])
    expect(stat.byAttempt[0]).toMatchObject({ attempt: 1, people: 3, avgMark: 40 })
    expect(stat.byAttempt[0]?.passRate).toBeCloseTo(1 / 3)
    expect(stat.byAttempt.at(-1)).toMatchObject({ attempt: 3, people: 1, passRate: 1 })
  })

  it('sin intentos guardados, cuenta por los reintentos', () => {
    const stat = examStat(
      exam,
      [attempt(1, '2026-01-01', 100, true)],
      [
        // Ya contada por sus intentos: no se repite.
        { userId: 1, projectId: 1, validated: true, occurrence: 4 },
        { userId: 5, projectId: 1, validated: true, occurrence: 5 },
        { userId: 6, projectId: 1, validated: false, occurrence: 1 },
      ],
    )

    expect(stat).toMatchObject({ people: 3, passed: 2, attemptsToPass: [1, 0, 0, 0, 1] })
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
