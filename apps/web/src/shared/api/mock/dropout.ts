/**
 * El abandono de mentira (`docs/abandono.md`): cuarenta piscineros inventados
 * de una piscina que empezó un lunes hace unas tres semanas, con quien viene
 * mucho, quien viene poco, quien lo dejó y quien no vino nunca. Las cuentas
 * (riesgo, correlaciones, parejas) son una versión sencilla de las de la API:
 * aquí solo tienen que ser coherentes para poder probar la pantalla.
 */

import type {
  DropoutCorrelation,
  DropoutDay,
  DropoutFactorKey,
  DropoutFactors,
  DropoutGroup,
  DropoutPair,
  DropoutPerson,
  DropoutReason,
  DropoutReport,
  DropoutStatus,
  DropoutTuning,
  DropoutWeightKey,
} from '@sanatorio/contracts'

import type { DropoutTweaks } from '../types'

import { portrait } from './portrait'
import { delay } from './state'

const DAY = 86_400_000
const FACTORS: DropoutFactorKey[] = [
  'gone',
  'risk',
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
const PEOPLE = 40
/** Quienes están en el examen de hoy (por su número): sin faltas, con la razón `inExam`. */
const IN_EXAM = new Set([3, 6])

/** Los ajustes de fábrica, los mismos que la API. */
const DEFAULTS: DropoutTuning = {
  weekdayBase: 0.35,
  weekdayHours: 0.5,
  fullDayHours: 8,
  fridayExtra: 1,
  weekendWeight: 0.4,
  weekMissed: 5,
  fridayToMonday: true,
  likely: 70,
  doubt: 35,
  weights: {
    totalHours: 0,
    avgHours: 0,
    firstWeekHours: 0,
    attendance: 0,
    weekendShare: 0,
    isolation: 0,
    partners: 0,
    given: 0,
    received: 0,
    passed: 0,
  },
}

/** Un número de 0 a 1 que siempre sale igual para la misma semilla. */
function seeded(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280

  return x - Math.floor(x)
}

const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10)
/** 1 lunes … 7 domingo. */
const weekdayOf = (ms: number): number => ((new Date(ms).getUTCDay() + 6) % 7) + 1

function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length
  const mx = xs.reduce((sum, x) => sum + x, 0) / n
  const my = ys.reduce((sum, y) => sum + y, 0) / n
  let sxy = 0
  let sxx = 0
  let syy = 0

  for (let i = 0; i < n; i++) {
    const dx = (xs[i] ?? 0) - mx
    const dy = (ys[i] ?? 0) - my

    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }

  return sxx === 0 || syy === 0 ? 0 : Math.round((100 * sxy) / Math.sqrt(sxx * syy))
}

/** Los valores normalizados (media 0, desviación 1). */
function zOf(values: readonly number[]): number[] {
  const n = values.length
  const mean = values.reduce((sum, v) => sum + v, 0) / n
  const sd = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n) || 1

  return values.map((v) => (v - mean) / sd)
}

/**
 * Lo de cada piscinero que no depende de los ajustes: sus horas, sus faltas y
 * sus factores (sin el riesgo ni el abandono, que salen del cálculo).
 */
type Raw = {
  login: string
  never: boolean
  inExam: boolean
  hours: number[]
  last: number
  missed: number
  missedDays: DropoutDay[]
  missedWeekdays: number
  missedFriday: boolean
  missedFriToMon: boolean
  avgHours: number
  /** Qué parte de los fines de semana que han pasado vino (0–1). */
  weekendRate: number
  factors: Omit<DropoutFactors, 'risk' | 'gone'>
}

function poolOf(now: number): { start: number; today: number; days: DropoutDay[]; raws: Raw[] } {
  // El lunes de hace unas tres semanas, a medianoche.
  const today = Math.floor(now / DAY) * DAY
  const back = today - 19 * DAY
  const start = back - (weekdayOf(back) - 1) * DAY
  const count = Math.round((today - start) / DAY) + 1
  const days: DropoutDay[] = Array.from({ length: count }, (_, index) => {
    const at = start + index * DAY

    return {
      day: isoDay(at),
      weekday: weekdayOf(at),
      index,
      week: Math.min(5, Math.floor(index / 7) + 1),
    }
  })
  const past = days.filter((each) => each.day !== isoDay(today))
  const raws = Array.from({ length: PEOPLE }, (_, n): Raw => {
    const login = `pisci${String(n + 1).padStart(2, '0')}`
    const r = (k: number): number => seeded(n * 31 + k)
    // Cuántas horas suele venir y si viene los fines de semana.
    const usual = n % 3 === 0 ? 8 + r(1) * 3 : n % 3 === 1 ? 4 + r(2) * 3 : 1 + r(3) * 2
    const weekends = r(4) < 0.4
    // Unos pocos no vienen nunca; un tercio lo deja en algún momento; quien
    // está hoy en el examen, no.
    const never = n === 38 || n === 39
    const inExam = IN_EXAM.has(n)
    const leaves = !never && !inExam && r(5) < 0.33 ? 2 + Math.floor(r(6) * (count - 4)) : null
    const hours = days.map((each) => {
      if (never) return 0
      if (leaves !== null && each.index >= leaves) return 0
      if (each.day === isoDay(today)) return 0
      if (each.weekday >= 6 && !weekends) return 0
      if (!inExam && r(10 + each.index) < 0.12) return 0

      return Math.round(usual * (0.6 + r(50 + each.index) * 0.8) * 10) / 10
    })
    const attended = hours.filter((h) => h > 0)
    const last = inExam
      ? count - 1
      : hours.reduce<number>((at, h, index) => (h > 0 ? index : at), -1)
    const missed = last < 0 ? past.length : Math.max(0, past.length - 1 - last)
    const missedDays = missed === 0 ? [] : past.slice(past.length - missed)
    const missedFriday = missedDays.some((each) => each.weekday === 5)
    const avgHours =
      attended.length === 0 ? 0 : attended.reduce((sum, h) => sum + h, 0) / attended.length
    const total = attended.reduce((sum, h) => sum + h, 0)
    const weekendHours = hours.reduce(
      (sum, h, index) => sum + ((days[index]?.weekday ?? 1) >= 6 ? h : 0),
      0,
    )
    const weekendDays = past.filter((each) => each.weekday >= 6)
    const elapsedWeekdays = past
      .slice(0, leaves !== null && last >= 0 ? last + 1 : past.length)
      .filter((each) => each.weekday <= 5).length
    const attendedWeekdays = hours.filter(
      (h, index) => h > 0 && (days[index]?.weekday ?? 1) <= 5,
    ).length

    return {
      login,
      never,
      inExam,
      hours,
      last,
      missed,
      missedDays,
      missedWeekdays: missedDays.filter((each) => each.weekday <= 5).length,
      missedFriday,
      missedFriToMon:
        missedFriday && missedDays.some((each) => each.weekday === 1 && each.index > last + 1),
      avgHours,
      weekendRate:
        weekendDays.length === 0
          ? 0
          : weekendDays.filter((each) => (hours[each.index] ?? 0) > 0).length / weekendDays.length,
      factors: {
        totalHours: Math.round(total),
        avgHours: Math.round(avgHours * 10) / 10,
        firstWeekHours: Math.round(hours.slice(0, 7).reduce((sum, h) => sum + h, 0)),
        attendance:
          elapsedWeekdays === 0 ? 0 : Math.round((100 * attendedWeekdays) / elapsedWeekdays),
        weekendShare: total === 0 ? 0 : Math.round((100 * weekendHours) / total),
        isolation: never ? 0 : Math.round(15 + r(7) * 50 + (leaves !== null ? 20 : 0)),
        partners: never ? 0 : Math.round(3 + r(8) * 20 - (leaves !== null ? 4 : 0)),
        given: never ? 0 : Math.round(attended.length * (0.3 + r(9) * 0.5)),
        received: never ? 0 : Math.round(attended.length * (0.3 + r(11) * 0.4)),
        passed: never ? 0 : Math.min(16, Math.round((total / 30) * (0.6 + r(12) * 0.6))),
      },
    }
  })

  return { start, today, days, raws }
}

/**
 * El riesgo de cada cual con estos ajustes, como en la API en sencillo: cada
 * día sin venir suma a λ y cada factor con peso suma su peso por lo que se
 * aparta de la media de la piscina.
 */
function personOf(
  raw: Raw,
  tuning: DropoutTuning,
  z: (key: DropoutWeightKey) => number,
  days: readonly DropoutDay[],
  today: string,
): DropoutPerson {
  const missedLambda = raw.missedDays.reduce(
    (sum, each) =>
      sum +
      (each.weekday <= 5
        ? tuning.weekdayBase + tuning.weekdayHours * Math.min(1, raw.avgHours / tuning.fullDayHours)
        : tuning.weekendWeight * raw.weekendRate) +
      (each.weekday === 5 ? tuning.fridayExtra : 0),
    0,
  )
  const weighted = (Object.keys(tuning.weights) as DropoutWeightKey[]).reduce(
    (sum, key) => sum + tuning.weights[key] * z(key),
    0,
  )
  const lambda = Math.max(0, missedLambda + weighted)
  const gone =
    !raw.never &&
    !raw.inExam &&
    ((tuning.fridayToMonday && raw.missedFriToMon) || raw.missedWeekdays >= tuning.weekMissed)
  const risk = raw.never || gone ? 100 : Math.round(100 * (1 - Math.exp(-lambda)))
  const status: DropoutStatus = raw.never
    ? 'never'
    : gone
      ? 'gone'
      : raw.inExam
        ? 'active'
        : risk >= tuning.likely
          ? 'likely'
          : risk >= tuning.doubt
            ? 'doubt'
            : 'active'
  const reasons: DropoutReason[] = []

  if (raw.inExam) reasons.push('inExam')
  else if (raw.missed <= 1 && !raw.never) reasons.push('recent')
  if (raw.missedFriToMon && tuning.fridayToMonday) reasons.push('missedWeekend')
  else if (raw.missedFriday) reasons.push('missedFriday')
  if (raw.missedWeekdays >= tuning.weekMissed) reasons.push('missedWeek')
  if (raw.missed > 1 && raw.missedWeekdays === 0) reasons.push('weekendOnly')
  if (raw.missed > 0 && raw.avgHours >= 7) reasons.push('heavyUser')
  if (raw.missed > 0 && raw.avgHours > 0 && raw.avgHours < 3) reasons.push('lightUser')

  const lastDay = raw.last < 0 ? null : (days[raw.last]?.day ?? null)
  const nextDay = raw.last < 0 ? null : (days[raw.last + 1]?.day ?? null)
  const left = (status === 'gone' || status === 'likely') && lastDay !== null && nextDay !== null

  return {
    login: raw.login,
    image: portrait(raw.login),
    status,
    hours: raw.hours.map((h, index) => (days[index]?.day === today && h === 0 ? null : h)),
    lastSeen: lastDay,
    missedDays: raw.missed,
    missedWeekdays: raw.missedWeekdays,
    leftBetween: left ? [lastDay, nextDay] : null,
    leftWeek: left ? (days[raw.last + 1]?.week ?? null) : null,
    reasons,
    factors: { ...raw.factors, risk, gone: status === 'gone' ? 1 : 0 },
  }
}

function dropoutReport(tweaks: DropoutTweaks = {}, now = Date.now()): DropoutReport {
  const tuning: DropoutTuning = {
    ...DEFAULTS,
    ...tweaks,
    weights: { ...DEFAULTS.weights, ...tweaks.weights },
  }
  const { start, today, days, raws } = poolOf(now)
  const came = raws.filter((raw) => !raw.never)
  const zs = new Map(
    (Object.keys(DEFAULTS.weights) as DropoutWeightKey[]).map((key) => {
      const values = zOf(came.map((raw) => raw.factors[key]))

      return [key, new Map(came.map((raw, index) => [raw.login, values[index] ?? 0]))] as const
    }),
  )
  const people = raws.map((raw) =>
    personOf(raw, tuning, (key) => zs.get(key)?.get(raw.login) ?? 0, days, isoDay(today)),
  )
  const sample = people.filter((person) => person.status !== 'never')
  const column = (key: DropoutFactorKey): number[] => sample.map((p) => p.factors[key])
  const correlations: DropoutCorrelation[] = FACTORS.flatMap((a, i) =>
    FACTORS.slice(i + 1).map((b) => ({ a, b, r: pearson(column(a), column(b)) })),
  )
  const r = (a: DropoutFactorKey, b: DropoutFactorKey): number =>
    correlations.find((each) => (each.a === a && each.b === b) || (each.a === b && each.b === a))
      ?.r ?? 0
  const gone = column('gone')
  const candidates = FACTORS.filter((key) => key !== 'gone' && key !== 'risk')
  const pairs: DropoutPair[] = candidates
    .flatMap((a, i) =>
      candidates.slice(i + 1).map((b) => {
        const ra = r(a, 'gone')
        const rb = r(b, 'gone')
        const za = zOf(column(a)).map((v) => (ra < 0 ? -v : v))
        const zb = zOf(column(b)).map((v) => (rb < 0 ? -v : v))
        const together = pearson(
          za.map((v, k) => (v + (zb[k] ?? 0)) / 2),
          gone,
        )

        return {
          a,
          b,
          between: r(a, b),
          ra,
          rb,
          together,
          gain: Math.abs(together) - Math.max(Math.abs(ra), Math.abs(rb)),
        }
      }),
    )
    .sort((x, y) => Math.abs(y.together) - Math.abs(x.together))
  const groups: DropoutGroup[] = [
    { factors: ['totalHours', 'avgHours', 'firstWeekHours'], together: r('totalHours', 'gone') },
    { factors: ['given', 'received', 'passed'], together: r('given', 'gone') },
  ]

  const count = (status: DropoutStatus): number =>
    people.filter((person) => person.status === status).length

  return {
    tuning,
    defaults: DEFAULTS,
    counts: {
      people: people.length,
      gone: count('gone'),
      likely: count('likely'),
      doubt: count('doubt'),
      active: count('active'),
      never: count('never'),
      inExam: people.filter((person) => person.reasons.includes('inExam')).length,
    },
    campus: 'Madrid',
    start: days[0]?.day ?? null,
    pools: [
      { start: days[0]?.day ?? '', people: PEOPLE },
      { start: isoDay(start - 63 * DAY), people: 52 },
    ],
    days,
    today: isoDay(today),
    people,
    factors: FACTORS,
    correlations,
    pairs,
    groups,
    sample: sample.length,
  }
}

export const dropoutMock = {
  async getDropout(_start?: string, tweaks?: DropoutTweaks): Promise<DropoutReport> {
    await delay(150)

    return dropoutReport(tweaks)
  },
}
