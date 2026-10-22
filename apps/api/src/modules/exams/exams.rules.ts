/**
 * Las cuentas de las estadísticas de exámenes y de la duración de los
 * círculos. Sin base de datos: se prueban solas.
 */

import type { CircleDuration, ExamStat, LiveExam, LiveExaminee } from '@sanatorio/contracts'

import { localMoment } from '../../core/time.js'

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

/** Con el examen en marcha, cada cuánto se vuelven a pedir solas la lista y las notas. */
export const LIVE_AUTO_MS = 5 * 60_000

/**
 * Lo menos que tiene que pasar entre dos refrescos pedidos a mano. Cuenta para
 * todo el campus a la vez: si cada persona pudiera pedir uno por minuto, un
 * aula llena gastaría la cuota de 42 en un rato.
 */
export const LIVE_MANUAL_MS = 60_000

/**
 * Qué se puede pedir a 42 de un examen en vivo, según cuándo fue el último
 * refresco (de quien fuera). Sin refresco previo, todo vale ya.
 */
export function liveRefreshPlan(
  lastAt: number | null,
  now: number,
): { auto: boolean; manual: boolean; nextAt: number; manualAt: number } {
  if (lastAt === null) return { auto: true, manual: true, nextAt: now, manualAt: now }

  return {
    auto: now - lastAt >= LIVE_AUTO_MS,
    manual: now - lastAt >= LIVE_MANUAL_MS,
    nextAt: lastAt + LIVE_AUTO_MS,
    manualAt: lastAt + LIVE_MANUAL_MS,
  }
}

/**
 * El día de un examen visto desde el campus: hoy, mañana o más adelante.
 *
 * Se cuenta en la hora del campus, no en UTC ni en la del servidor: un examen
 * a las 00:30 de Madrid es «mañana» a las 23:30 de la víspera, aunque en UTC
 * aún sea el mismo día. Lo que ya empezó (un examen de noche que sigue en
 * marcha) cuenta como de hoy.
 */
export function examDay(
  beginAt: string,
  now: number,
  timeZone: string | undefined,
): NonNullable<LiveExam['exam']>['when'] {
  const days =
    (Date.parse(localMoment(Date.parse(beginAt), timeZone).day) -
      Date.parse(localMoment(now, timeZone).day)) /
    DAY_MS

  return days <= 0 ? 'today' : days === 1 ? 'tomorrow' : 'later'
}

/** El primer y el último círculo con examen en el common core (`exam('02')`…`exam('06')`). */
const FIRST_EXAM_CIRCLE = 2
const LAST_EXAM_CIRCLE = 6

/**
 * El examen que le toca a alguien por el círculo en que va: el del círculo N
 * es el Exam Rank 0N, como en `COMMON_CORE` y en la tabla de partida del plan
 * nuevo. El plan clásico hace `exam-rank-0N`; el nuevo, `42next-exam-rank-0N`.
 * Antes del círculo 2 no hay examen.
 */
export function expectedExamSlug(
  track: LiveExaminee['track'],
  circle: number | null,
): string | null {
  if (circle === null || circle < FIRST_EXAM_CIRCLE) return null

  const rank = `exam-rank-0${String(Math.min(LAST_EXAM_CIRCLE, circle))}`

  return track === 'next' ? `42next-${rank}` : rank
}

/** La fila de alguien en un examen (`project_users`), tal como está en la réplica. */
export type ExamRow = {
  status: string
  finalMark: number | null
  validated: boolean | null
  updatedAt: string | null
}

/**
 * Cómo va alguien en la sesión de examen que empezó en `since`.
 *
 * Solo cuenta la fila tocada desde que empezó: la de un intento de otro día
 * dice `finished` aunque hoy aún no haya entrado. Cerrada (`finished`) con
 * 100 o más y validada, aprueba; cerrada sin llegar a 100 (o sin validar),
 * suspende, aunque la sesión no haya acabado: en 42 ya no puede subir.
 */
export function examineeStatus(
  row: ExamRow | undefined,
  attempt: { mark: number | null; passed: boolean } | undefined,
  since: string,
): LiveExaminee['status'] {
  const recent = row !== undefined && row.updatedAt !== null && row.updatedAt >= since

  if (recent && row.status === 'finished') {
    return (row.finalMark ?? 0) >= 100 && row.validated !== false ? 'passed' : 'failed'
  }
  if (attempt?.passed === true) return 'passed'

  return recent || attempt !== undefined ? 'inProgress' : 'pending'
}
