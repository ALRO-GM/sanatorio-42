/**
 * Las cuentas de la pestaña de abandono (`docs/abandono.md`) que hace la web
 * con lo que da la API: qué gente enseña cada filtro, los abandonos por día,
 * por semana y por día de la semana, las cifras de arriba y la recta de una
 * dispersión. Sin React, para probarlas sueltas.
 */

import type { DropoutFactorKey, DropoutPerson, DropoutReport } from '@sanatorio/contracts'

/** Los filtros de la tabla. */
export const FILTERS = ['likely', 'all', 'staying', 'never'] as const
export type DropoutFilter = (typeof FILTERS)[number]

/** Qué abandonos cuentan en las gráficas: solo los confirmados o también los probables. */
export const INCLUDES = ['gone', 'likely'] as const
export type DropoutInclude = (typeof INCLUDES)[number]

/** Cómo se agrupan los abandonos: por día o por semana de piscina. */
export const GROUPINGS = ['day', 'week'] as const
export type DropoutGrouping = (typeof GROUPINGS)[number]

/** Por debajo de esto, con la razón de haber venido hace nada o de haber terminado, «sigue seguro». */
const SAFE_RISK = 15

/** La gente que enseña cada filtro, de más a menos riesgo. */
export function filterPeople(
  people: readonly DropoutPerson[],
  filter: DropoutFilter,
): DropoutPerson[] {
  const keep = (person: DropoutPerson): boolean => {
    switch (filter) {
      case 'likely':
        return person.status === 'gone' || person.status === 'likely'
      case 'staying':
        return (
          person.status === 'active' &&
          (person.factors.risk < SAFE_RISK ||
            person.reasons.includes('recent') ||
            person.reasons.includes('finished'))
        )
      case 'never':
        return person.status === 'never'
      case 'all':
        return true
    }
  }

  return people
    .filter(keep)
    .sort((a, b) => b.factors.risk - a.factors.risk || a.login.localeCompare(b.login))
}

/** Quien lo dejó (con el día en que lo dejó), según lo que cuenta. */
function leaversOf(
  people: readonly DropoutPerson[],
  include: DropoutInclude,
): (DropoutPerson & { leftBetween: [string, string] })[] {
  return people.flatMap((person) =>
    person.leftBetween !== null &&
    (person.status === 'gone' || (include === 'likely' && person.status === 'likely'))
      ? [{ ...person, leftBetween: person.leftBetween }]
      : [],
  )
}

/** Una barra de la gráfica de abandonos: cuántos ese día (o semana) y cuántos hasta entonces. */
export type DepartureBar = { key: string; week: number; count: number; total: number }

/**
 * Los abandonos por día (el primer día que ya no vinieron) o por semana de
 * piscina, con el acumulado. Los días van del segundo de la piscina a hoy: el
 * primero nadie lo ha dejado aún.
 */
export function departures(
  report: DropoutReport,
  include: DropoutInclude,
  grouping: DropoutGrouping,
): DepartureBar[] {
  const leavers = leaversOf(report.people, include)
  const byDay = new Map<string, number>()

  for (const person of leavers) {
    byDay.set(person.leftBetween[1], (byDay.get(person.leftBetween[1]) ?? 0) + 1)
  }

  let total = 0

  if (grouping === 'day') {
    return report.days.slice(1).map((day) => {
      const count = byDay.get(day.day) ?? 0

      total += count

      return { key: day.day, week: day.week, count, total }
    })
  }

  const weeks = [...new Set(report.days.map((day) => day.week))]

  return weeks.map((week) => {
    const count = report.days
      .filter((day) => day.week === week)
      .reduce((sum, day) => sum + (byDay.get(day.day) ?? 0), 0)

    total += count

    return { key: String(week), week, count, total }
  })
}

/** El día de la semana de un `YYYY-MM-DD` (1 lunes … 7 domingo). */
export function weekdayOf(day: string): number {
  return ((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7) + 1
}

/** El día del mes de un `YYYY-MM-DD`. */
export const dateOf = (day: string): number => Number(day.slice(8, 10))

/**
 * Cuántos lo dejan en cada cambio de día de la semana: el 5 es «del viernes al
 * sábado». Siempre los siete, en orden.
 */
export function transitions(
  people: readonly DropoutPerson[],
  include: DropoutInclude,
): { from: number; count: number }[] {
  const counts = new Map<number, number>()

  for (const person of leaversOf(people, include)) {
    const from = weekdayOf(person.leftBetween[0])

    counts.set(from, (counts.get(from) ?? 0) + 1)
  }

  return [1, 2, 3, 4, 5, 6, 7].map((from) => ({ from, count: counts.get(from) ?? 0 }))
}

const mean = (values: readonly number[]): number | null =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length

/** Las cifras de arriba de la pestaña. */
type DropoutSummary = {
  gone: number
  likely: number
  never: number
  people: number
  /** Qué parte de la piscina lo ha dejado (confirmados), de 0 a 100. */
  share: number
  /** Horas de media al día, los días que vino, de quien lo dejó y de quien sigue. */
  avgLeavers: number | null
  avgStaying: number | null
  /** Horas en total de media de quien lo dejó, antes de dejarlo. */
  totalLeavers: number | null
  /** La semana de piscina con más abandonos y el día de la semana tras el que más lo dejan. */
  topWeek: number | null
  topWeekday: number | null
}

export function summaryOf(report: DropoutReport, include: DropoutInclude): DropoutSummary {
  const count = (status: DropoutPerson['status']): number =>
    report.people.filter((person) => person.status === status).length
  const leavers = leaversOf(report.people, include)
  const staying = report.people.filter((person) => person.status === 'active')
  const weeks = departures(report, include, 'week')
  const days = transitions(report.people, include)
  const top = <T extends { count: number }>(list: readonly T[]): T | null =>
    list.reduce<T | null>((best, each) => (each.count > (best?.count ?? 0) ? each : best), null)

  return {
    gone: count('gone'),
    likely: count('likely'),
    never: count('never'),
    people: report.people.length,
    share:
      report.people.length === 0 ? 0 : Math.round((100 * count('gone')) / report.people.length),
    avgLeavers: mean(leavers.map((person) => person.factors.avgHours)),
    avgStaying: mean(staying.map((person) => person.factors.avgHours)),
    totalLeavers: mean(leavers.map((person) => person.factors.totalHours)),
    topWeek: top(weeks)?.week ?? null,
    topWeekday: top(days)?.from ?? null,
  }
}

/** La correlación entre dos factores (−100…100), en cualquier orden; 100 consigo mismo. */
export function correlationOf(report: DropoutReport, a: DropoutFactorKey, b: DropoutFactorKey) {
  if (a === b) return 100

  return (
    report.correlations.find(
      (each) => (each.a === a && each.b === b) || (each.a === b && each.b === a),
    )?.r ?? 0
  )
}

/** La recta que mejor pasa por unos puntos (mínimos cuadrados), o `null` sin pendiente. */
export function trendOf(
  points: readonly { x: number; y: number }[],
): { slope: number; intercept: number } | null {
  const n = points.length

  if (n < 2) return null

  const mx = points.reduce((sum, p) => sum + p.x, 0) / n
  const my = points.reduce((sum, p) => sum + p.y, 0) / n
  const sxx = points.reduce((sum, p) => sum + (p.x - mx) ** 2, 0)

  if (sxx === 0) return null

  const slope = points.reduce((sum, p) => sum + (p.x - mx) * (p.y - my), 0) / sxx

  return { slope, intercept: my - slope * mx }
}
