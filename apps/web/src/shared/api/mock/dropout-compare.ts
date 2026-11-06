/**
 * La comparación de piscinas de mentira (`docs/abandono.md`): diez piscinas
 * de Madrid inventadas, una al mes, con entre 40 y 300 personas y un abandono
 * distinto en cada una. Las dos más viejas no tienen horas de puestos
 * copiadas, para que se vea el aviso de que faltan datos. Los ajustes del
 * cálculo mueven las cifras de una forma sencilla, solo para que la pantalla
 * reaccione como con la API.
 */

import type {
  DropoutAverages,
  DropoutComparison,
  DropoutPoolSummary,
  DropoutTuning,
} from '@sanatorio/contracts'

import type { DropoutTweaks } from '../types'

const DAY = 86_400_000
const POOLS = 10
/** El eje de la supervivencia: del día 0 al 28 de piscina. */
const LAST_DAY = 28
const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10)

/** Un número de 0 a 1 que siempre sale igual para la misma semilla. */
function seeded(seed: number): number {
  const x = Math.sin(seed * 7919 + 104_729) * 15_485_863

  return x - Math.floor(x)
}

/** El lunes de la semana de `at`, a medianoche. */
function mondayOf(at: number): number {
  const day = Math.floor(at / DAY) * DAY

  return day - ((new Date(day).getUTCDay() + 6) % 7) * DAY
}

/**
 * El día de piscina en que lo deja cada cual: más después de los viernes de
 * examen (los sábados, días 5, 12, 19 y 26) y más al principio.
 */
function leaveDays(count: number, seed: number): number[] {
  const weights = Array.from({ length: LAST_DAY }, (_, index) => {
    const day = index + 1

    return (day % 7 === 5 ? 4 : 1) * (1.6 - day / LAST_DAY)
  })
  const total = weights.reduce((sum, weight) => sum + weight, 0)

  return Array.from({ length: count }, (_, n) => {
    let pick = seeded(seed * 97 + n) * total

    for (let index = 0; index < weights.length; index++) {
      pick -= weights[index] ?? 0
      if (pick <= 0) return index + 1
    }

    return LAST_DAY
  })
}

const round1 = (value: number): number => Math.round(value * 10) / 10

function averages(people: number, seed: number, leaving: boolean, leftDay: number | null) {
  const r = (k: number): number => seeded(seed * 13 + k)
  const scale = leaving ? 0.55 : 1

  return {
    people,
    avgHours: people === 0 ? null : round1((5 + r(1) * 3) * scale),
    totalHours: people === 0 ? null : Math.round((110 + r(2) * 60) * (leaving ? 0.3 : 1)),
    firstWeekHours: people === 0 ? null : Math.round((30 + r(3) * 15) * (leaving ? 0.7 : 1)),
    attendance: people === 0 ? null : Math.round((70 + r(4) * 25) * (leaving ? 0.6 : 1)),
    isolation: people === 0 ? null : Math.round((25 + r(5) * 20) * (leaving ? 1.5 : 1)),
    given: people === 0 ? null : round1((10 + r(6) * 8) * scale),
    received: people === 0 ? null : round1((9 + r(7) * 7) * scale),
    passed: people === 0 ? null : round1((7 + r(8) * 5) * (leaving ? 0.35 : 1)),
    leftDay,
  } satisfies DropoutAverages
}

/** Una piscina inventada: su gente, quién lo deja y cuándo, con estos ajustes. */
function poolOf(start: number, index: number, tuning: DropoutTuning, now: number) {
  const people = 40 + Math.round(seeded(index * 3 + 1) * 260)
  // De 10 a 40 % de abandono, más o menos según los ajustes.
  // Más estricto (menos días para darlo por perdido, viernes a lunes) sube
  // los confirmados; cada día entre semana que pesa más sube los probables.
  const strictness = (5 / tuning.weekMissed) * (tuning.fridayToMonday ? 1 : 0.8)
  const goneRate = Math.min(0.6, (0.1 + seeded(index * 3 + 2) * 0.3) * strictness)
  const likelyRate = Math.min(
    0.3,
    0.05 * (70 / Math.max(1, tuning.likely)) * ((tuning.weekdayBase + 0.35) / 0.7),
  )
  const doubtRate = Math.min(0.3, 0.06 * (35 / Math.max(1, tuning.doubt)))
  const never = Math.round(people * 0.03)
  const gone = Math.round(people * goneRate)
  const likely = Math.round(people * likelyRate)
  const doubt = Math.round(people * doubtRate)
  const elapsed = Math.min(LAST_DAY, Math.floor((now - start) / DAY))
  const goneDays = leaveDays(gone, index + 1).filter((day) => day <= elapsed)
  const likelyDays = leaveDays(likely, index + 50).filter((day) => day <= elapsed)
  const staying = (days: readonly number[]): (number | null)[] =>
    Array.from({ length: LAST_DAY + 1 }, (_, day) =>
      day > elapsed
        ? null
        : round1((100 * (people - days.filter((left) => left <= day).length)) / people),
    )
  const perWeek = (days: readonly number[]): number[] =>
    [1, 2, 3, 4].map(
      (week) => days.filter((day) => Math.min(4, Math.ceil(day / 7)) === week).length,
    )
  const perWeekday = (days: readonly number[]): number[] =>
    [0, 1, 2, 3, 4, 5, 6].map((from) => days.filter((day) => (day - 1) % 7 === from).length)
  const leftDay =
    goneDays.length === 0
      ? null
      : round1(goneDays.reduce((sum, day) => sum + day, 0) / goneDays.length)
  const leaving = goneDays.length + likelyDays.length

  return {
    start: isoDay(start),
    counts: {
      people,
      gone: goneDays.length,
      likely: likelyDays.length,
      doubt,
      active: people - goneDays.length - likelyDays.length - doubt - never,
      never,
      inExam: 0,
    },
    staying: staying(goneDays),
    stayingLikely: staying([...goneDays, ...likelyDays]),
    byWeek: { gone: perWeek(goneDays), likely: perWeek(likelyDays) },
    byWeekday: { gone: perWeekday(goneDays), likely: perWeekday(likelyDays) },
    leaving: averages(leaving, index, true, leftDay),
    remaining: averages(people - leaving, index + 100, false, null),
    // Las dos más viejas aún no tienen las horas de los puestos copiadas.
    sessionHours: index >= POOLS - 2 ? 0 : people * 120,
  } satisfies DropoutPoolSummary
}

/** La media de una cifra de varios grupos, pesada por su gente. */
function weighted(
  groups: readonly DropoutAverages[],
  key: Exclude<keyof DropoutAverages, 'people'>,
): number | null {
  const known = groups.filter((group) => group[key] !== null && group.people > 0)
  const people = known.reduce((sum, group) => sum + group.people, 0)

  return people === 0
    ? null
    : round1(known.reduce((sum, group) => sum + (group[key] ?? 0) * group.people, 0) / people)
}

function mergeAverages(groups: readonly DropoutAverages[]): DropoutAverages {
  return {
    people: groups.reduce((sum, group) => sum + group.people, 0),
    avgHours: weighted(groups, 'avgHours'),
    totalHours: weighted(groups, 'totalHours'),
    firstWeekHours: weighted(groups, 'firstWeekHours'),
    attendance: weighted(groups, 'attendance'),
    isolation: weighted(groups, 'isolation'),
    given: weighted(groups, 'given'),
    received: weighted(groups, 'received'),
    passed: weighted(groups, 'passed'),
    leftDay: weighted(groups, 'leftDay'),
  }
}

/** Todas las elegidas juntas: sumas, y medias pesadas por la gente de cada una. */
function overallOf(pools: readonly DropoutPoolSummary[]): DropoutPoolSummary {
  const sum = (pick: (pool: DropoutPoolSummary) => number): number =>
    pools.reduce((total, pool) => total + pick(pool), 0)
  const people = sum((pool) => pool.counts.people)
  const curve = (pick: (pool: DropoutPoolSummary) => (number | null)[]) =>
    Array.from({ length: LAST_DAY + 1 }, (_, day) => {
      const known = pools.filter((pool) => pick(pool)[day] !== null)
      const total = known.reduce((s, pool) => s + pool.counts.people, 0)

      return total === 0
        ? null
        : round1(
            known.reduce((s, pool) => s + (pick(pool)[day] ?? 0) * pool.counts.people, 0) / total,
          )
    })
  const add = (pick: (pool: DropoutPoolSummary) => number[], length: number): number[] =>
    Array.from({ length }, (_, index) => sum((pool) => pick(pool)[index] ?? 0))

  return {
    start: null,
    counts: {
      people,
      gone: sum((pool) => pool.counts.gone),
      likely: sum((pool) => pool.counts.likely),
      doubt: sum((pool) => pool.counts.doubt),
      active: sum((pool) => pool.counts.active),
      never: sum((pool) => pool.counts.never),
      inExam: sum((pool) => pool.counts.inExam),
    },
    staying: curve((pool) => pool.staying),
    stayingLikely: curve((pool) => pool.stayingLikely),
    byWeek: {
      gone: add((pool) => pool.byWeek.gone, 4),
      likely: add((pool) => pool.byWeek.likely, 4),
    },
    byWeekday: {
      gone: add((pool) => pool.byWeekday.gone, 7),
      likely: add((pool) => pool.byWeekday.likely, 7),
    },
    leaving: mergeAverages(pools.map((pool) => pool.leaving)),
    remaining: mergeAverages(pools.map((pool) => pool.remaining)),
    sessionHours: sum((pool) => pool.sessionHours),
  }
}

export function dropoutComparison(
  starts: readonly string[],
  tweaks: DropoutTweaks,
  defaults: DropoutTuning,
  now = Date.now(),
): DropoutComparison {
  const tuning: DropoutTuning = {
    ...defaults,
    ...tweaks,
    weights: { ...defaults.weights, ...tweaks.weights },
  }
  // La en curso empezó el lunes de hace unas tres semanas; las demás, una al mes antes.
  const current = mondayOf(now - 19 * DAY)
  const all = Array.from({ length: POOLS }, (_, index) =>
    poolOf(index === 0 ? current : mondayOf(current - index * 28 * DAY - DAY), index, tuning, now),
  )
  const pools = starts.length === 0 ? all : all.filter((pool) => starts.includes(pool.start))

  return {
    pools,
    overall: overallOf(pools),
    available: all.map((pool) => ({ start: pool.start, people: pool.counts.people })),
    lastDay: LAST_DAY,
    tuning,
  }
}
