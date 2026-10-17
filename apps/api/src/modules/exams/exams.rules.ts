/**
 * Las cuentas de las estadísticas de exámenes y de la duración de los
 * círculos. Sin base de datos: se prueban solas.
 */

import type { CircleDuration, ExamStat } from '@sanatorio/contracts'

/** Un intento guardado: quién, de qué examen, con qué nota y cuándo. */
export type AttemptRow = {
  userId: number
  projectId: number
  mark: number | null
  validated: boolean | null
  at: string | null
}

/** Para quien no tiene los intentos guardados: si aprobó y cuántas veces reintentó. */
export type OccurrenceRow = {
  userId: number
  projectId: number
  validated: boolean | null
  occurrence: number | null
}

const average = (values: readonly number[]): number | null =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length

/** Las estadísticas de un examen a partir de sus intentos (y, si faltan, de los reintentos). */
export function examStat(
  project: { id: number; name: string },
  attempts: readonly AttemptRow[],
  occurrences: readonly OccurrenceRow[] = [],
): ExamStat {
  const byUser = new Map<number, AttemptRow[]>()

  for (const attempt of attempts) {
    if (attempt.projectId !== project.id) continue

    byUser.set(attempt.userId, [...(byUser.get(attempt.userId) ?? []), attempt])
  }

  /** Intentos hasta el primer aprobado, de cada persona que aprobó. */
  const toPass: number[] = []
  const perAttempt = new Map<number, { marks: number[]; people: number; passed: number }>()

  for (const list of byUser.values()) {
    const sorted = [...list].sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''))
    const first = sorted.findIndex((attempt) => attempt.validated === true)

    if (first >= 0) toPass.push(first + 1)

    for (const [index, attempt] of sorted.entries()) {
      const entry = perAttempt.get(index + 1) ?? { marks: [], people: 0, passed: 0 }

      entry.people += 1
      entry.passed += attempt.validated === true ? 1 : 0
      if (attempt.mark !== null) entry.marks.push(attempt.mark)
      perAttempt.set(index + 1, entry)
    }
  }

  // Quien no tiene intentos guardados cuenta por sus reintentos, si aprobó.
  let people = byUser.size

  for (const row of occurrences) {
    if (row.projectId !== project.id || byUser.has(row.userId)) continue

    people += 1
    if (row.validated === true && row.occurrence !== null) toPass.push(row.occurrence + 1)
  }

  const attemptsToPass: ExamStat['attemptsToPass'] = [0, 0, 0, 0, 0]

  for (const times of toPass) {
    const slot = Math.min(4, Math.max(0, times - 1))

    attemptsToPass[slot] = (attemptsToPass[slot] ?? 0) + 1
  }

  return {
    projectId: project.id,
    name: project.name,
    people,
    passed: toPass.length,
    avgAttempts: average(toPass),
    attemptsToPass,
    byAttempt: [...perAttempt]
      .sort(([a], [b]) => a - b)
      .map(([attempt, entry]) => ({
        attempt,
        people: entry.people,
        avgMark: average(entry.marks),
        passRate: entry.people === 0 ? 0 : entry.passed / entry.people,
      })),
  }
}

const DAY_MS = 24 * 3_600_000

/** El valor en ese tanto por uno de una lista ordenada (interpolando). */
function quantile(sorted: readonly number[], q: number): number {
  const at = (sorted.length - 1) * q
  const low = Math.floor(at)
  const high = Math.ceil(at)
  const a = sorted[low] ?? 0
  const b = sorted[high] ?? a

  return a + (b - a) * (at - low)
}

/**
 * Cuánto se tarda en cada círculo: del inicio del cursus (o del rango
 * anterior) al rango de ese círculo. Se descartan los casos extremos (fuera de
 * 1,5 veces el rango intercuartílico) y lo imposible (cero días o menos).
 */
export function circleDurations(
  people: readonly { begin: string | null; ranks: readonly string[] }[],
): CircleDuration[] {
  const days = new Map<number, number[]>()

  for (const person of people) {
    let previous = person.begin === null ? NaN : Date.parse(person.begin)

    for (const [circle, date] of person.ranks.entries()) {
      const at = Date.parse(date)

      if (!Number.isNaN(previous) && !Number.isNaN(at) && at > previous) {
        days.set(circle, [...(days.get(circle) ?? []), (at - previous) / DAY_MS])
      }

      previous = at
    }
  }

  return [...days]
    .sort(([a], [b]) => a - b)
    .flatMap(([circle, values]) => {
      const sorted = [...values].sort((a, b) => a - b)
      const q1 = quantile(sorted, 0.25)
      const q3 = quantile(sorted, 0.75)
      const spread = q3 - q1
      const kept = sorted.filter(
        (value) => value >= q1 - 1.5 * spread && value <= q3 + 1.5 * spread,
      )

      return kept.length === 0
        ? []
        : [
            {
              circle,
              people: kept.length,
              median: Math.round(quantile(kept, 0.5)),
              p25: Math.round(quantile(kept, 0.25)),
              p75: Math.round(quantile(kept, 0.75)),
            },
          ]
    })
}
