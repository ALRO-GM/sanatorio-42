/**
 * Las cuentas de la pestaña de abandono (`docs/abandono.md`) que hace la web
 * con lo que da la API: qué gente enseña cada filtro, los abandonos por día,
 * por semana y por día de la semana, las cifras de arriba y la recta de una
 * dispersión. Sin React, para probarlas sueltas.
 */

import type {
  DropoutCounts,
  DropoutFactorKey,
  DropoutPerson,
  DropoutReport,
  DropoutTuning,
  DropoutWeightKey,
} from '@sanatorio/contracts'

import type { DropoutTweaks } from '../../shared/api/types'

/** Los filtros de la tabla, en sus pastillas. */
export const FILTERS = ['likely', 'all', 'staying', 'never'] as const
/**
 * Lo que puede filtrar la tabla: sus pastillas y, desde los totales de
 * arriba, cada estado (`gone`, `probable`, `doubt`, `active`) y quien está en
 * el examen (`inExam`).
 */
export type DropoutFilter =
  (typeof FILTERS)[number] | 'gone' | 'probable' | 'doubt' | 'active' | 'inExam'

/** Los totales de arriba, en orden, y el filtro de la tabla que abre cada uno. */
export const COUNTS: readonly { key: keyof DropoutCounts; filter: DropoutFilter }[] = [
  { key: 'people', filter: 'all' },
  { key: 'gone', filter: 'gone' },
  { key: 'likely', filter: 'probable' },
  { key: 'doubt', filter: 'doubt' },
  { key: 'active', filter: 'active' },
  { key: 'never', filter: 'never' },
  { key: 'inExam', filter: 'inExam' },
]

/** Los parámetros del cálculo que se ajustan con un deslizador. */
export type DropoutParam = Exclude<keyof DropoutTuning, 'weights' | 'fridayToMonday'>

/** Lo que va y viene de cada deslizador (los mismos límites que valida la API). */
export const PARAM_RANGES: Record<DropoutParam, { min: number; max: number; step: number }> = {
  weekdayBase: { min: 0, max: 3, step: 0.05 },
  weekdayHours: { min: 0, max: 3, step: 0.05 },
  fullDayHours: { min: 1, max: 16, step: 0.5 },
  fridayExtra: { min: 0, max: 5, step: 0.1 },
  weekendWeight: { min: 0, max: 3, step: 0.05 },
  weekMissed: { min: 2, max: 15, step: 1 },
  likely: { min: 1, max: 100, step: 1 },
  doubt: { min: 1, max: 100, step: 1 },
}

export const PARAMS = Object.keys(PARAM_RANGES) as DropoutParam[]

/** Los pesos de los factores: de −2 (tener más baja el riesgo) a 2 (lo sube). */
export const WEIGHT_RANGE = { min: -2, max: 2, step: 0.1 }

export const WEIGHT_KEYS: readonly DropoutWeightKey[] = [
  'totalHours',
  'avgHours',
  'firstWeekHours',
  'attendance',
  'weekendShare',
  'isolation',
  'partners',
  'given',
  'received',
  'passed',
]

/** Los ajustes completos: lo de fábrica con lo cambiado encima. */
export function tuningOf(defaults: DropoutTuning, tweaks: DropoutTweaks): DropoutTuning {
  return { ...defaults, ...tweaks, weights: { ...defaults.weights, ...tweaks.weights } }
}

/** Lo que difiere de lo de fábrica: es lo que se manda a la API y se guarda. */
export function tweaksOf(tuning: DropoutTuning, defaults: DropoutTuning): DropoutTweaks {
  const tweaks: DropoutTweaks = {}
  const weights: Partial<Record<DropoutWeightKey, number>> = {}

  for (const key of PARAMS) {
    if (tuning[key] !== defaults[key]) tweaks[key] = tuning[key]
  }
  if (tuning.fridayToMonday !== defaults.fridayToMonday) {
    tweaks.fridayToMonday = tuning.fridayToMonday
  }
  for (const key of WEIGHT_KEYS) {
    if (tuning.weights[key] !== defaults.weights[key]) weights[key] = tuning.weights[key]
  }
  if (Object.keys(weights).length > 0) tweaks.weights = weights

  return tweaks
}

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
            person.reasons.includes('inExam') ||
            person.reasons.includes('finished'))
        )
      case 'never':
        return person.status === 'never'
      case 'gone':
      case 'doubt':
      case 'active':
        return person.status === filter
      case 'probable':
        return person.status === 'likely'
      case 'inExam':
        return person.reasons.includes('inExam')
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
export type DepartureBar = {
  key: string
  week: number
  count: number
  total: number
  /** Por días: el día de piscina, desde 1 (el lunes del inicio). Por semanas, `null`. */
  poolDay: number | null
}

/**
 * El último día de piscina del eje: el viernes de la cuarta semana, el del
 * examen final (todas empiezan en lunes: 4 semanas menos el fin de semana).
 */
export const LAST_POOL_DAY = 26

/** Si el día de piscina `poolDay` (desde 1) es de examen: el 5 y luego cada 7. */
export const isExamDay = (poolDay: number): boolean => poolDay >= 5 && (poolDay - 5) % 7 === 0

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
    // Del día 1 al 26 de piscina (pedido por Alberto el 2026-11-08), no días del mes.
    return report.days
      .filter((day) => day.index < LAST_POOL_DAY)
      .map((day) => {
        const count = byDay.get(day.day) ?? 0

        total += count

        return { key: day.day, week: day.week, count, total, poolDay: day.index + 1 }
      })
  }

  const weeks = [...new Set(report.days.map((day) => day.week))]

  return weeks.map((week) => {
    const count = report.days
      .filter((day) => day.week === week)
      .reduce((sum, day) => sum + (byDay.get(day.day) ?? 0), 0)

    total += count

    return { key: String(week), week, count, total, poolDay: null }
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

/**
 * Lo que la web saca de la gente para las cifras de arriba. Los totales por
 * estado no: los trae la API (`counts`), con la gente que ve quien mira.
 */
type DropoutSummary = {
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
  const leavers = leaversOf(report.people, include)
  const staying = report.people.filter((person) => person.status === 'active')
  const weeks = departures(report, include, 'week')
  const days = transitions(report.people, include)
  const top = <T extends { count: number }>(list: readonly T[]): T | null =>
    list.reduce<T | null>((best, each) => (each.count > (best?.count ?? 0) ? each : best), null)
  const { gone, people } = report.counts

  return {
    share: people === 0 ? 0 : Math.round((100 * gone) / people),
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
