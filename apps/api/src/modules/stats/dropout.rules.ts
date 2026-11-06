/**
 * Las reglas del abandono de la piscina (pedido por Alberto el 2026-11-06,
 * `docs/abandono.md`): cuentas puras, sin base de datos.
 *
 * La idea, con sus palabras: quien lleva muchos días sin venir a los
 * ordenadores posiblemente lo ha dejado, pero
 *
 * - faltar el sábado y el domingo no dice nada: mucha gente no viene;
 * - el viernes es el examen y casi todo el mundo entra: faltar viernes,
 *   sábado, domingo y lunes es abandono;
 * - pesa lo que venía antes: quien venía una hora al día y falta un día puede
 *   volver mañana; quien venía diez y deja de venir, es más raro.
 *
 * El día del abandono es el primero que deja de venir, una vez confirmado: se
 * da como «entre su último día y el siguiente».
 */

import type {
  DropoutCorrelation,
  DropoutDay,
  DropoutFactorKey,
  DropoutFactors,
  DropoutGroup,
  DropoutPair,
  DropoutReason,
  DropoutStatus,
  DropoutTuning,
  DropoutWeightKey,
} from '@sanatorio/contracts'

/** El día de piscina del examen final: el cuarto viernes, si empezó en lunes. */
const FINAL_EXAM_DAY = 25
/** Hasta qué día se miran las faltas: el lunes después del examen final. */
const LAST_COUNTED_DAY = 28
/** Hasta qué día se dibuja: una semana después del examen final. */
export const LAST_SHOWN_DAY = 32

/** Un día que se considera venido: algo más que entrar y salir. */
const PRESENT_HOURS = 0.25
/** Para las razones: quien venía mucho o poco entre semana. */
const HEAVY_HOURS = 6
const LIGHT_HOURS = 2

/**
 * Los ajustes de fábrica (`DropoutTuning`, se pueden cambiar en la web):
 *
 * - faltar un día entre semana pesa 0,35, y hasta 0,5 más según las horas que
 *   venía (entero con 8 h o más);
 * - el viernes de examen, 1 más;
 * - un día de fin de semana, 0,4 por la parte de fines de semana que venía;
 * - cinco días entre semana seguidos, o de viernes a lunes, es abandono;
 * - del 70 % es probable y del 35 %, en duda;
 * - ningún factor suma ni resta de entrada.
 */
export const DEFAULT_TUNING: DropoutTuning = {
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

const isWeekend = (weekday: number): boolean => weekday >= 6

/** Una persona para evaluar: sus horas de cada día de `days` (`null`, aún no era de la piscina). */
type Attendance = {
  hours: readonly (number | null)[]
  /**
   * Días (índices) en que vino aunque los puestos no lo digan: un examen o
   * una corrección. Los puestos de los piscineros solo se ven en la copia en
   * vivo, y en el examen no siempre.
   */
  present?: ReadonlySet<number>
  /** Si está en el examen de hoy (o lo ha hecho): no ha abandonado (2026-11-06). */
  inExam?: boolean
}

type Assessment = {
  status: DropoutStatus
  risk: number
  lastSeen: number | null
  missedDays: number
  missedWeekdays: number
  /** El índice del último día que vino y el del siguiente. */
  leftBetween: [number, number] | null
  leftWeek: number | null
  reasons: DropoutReason[]
  /** Asistencia entre semana hasta que lo dejó (0–100). */
  attendance: number
}

/**
 * Cómo va una persona hoy (`today`, índice en `days`; el día de hoy no cuenta
 * como falta porque aún no ha acabado). `profile`: lo que suman o restan a λ
 * sus factores (`profileLambda`), además de las faltas.
 */
export function assess(
  person: Attendance,
  days: readonly DropoutDay[],
  today: number,
  tuning: DropoutTuning = DEFAULT_TUNING,
  profile = 0,
): Assessment {
  const lastCounted = Math.min(today - 1, LAST_COUNTED_DAY, days.length - 1)
  const came = (index: number): boolean =>
    (person.hours[index] ?? 0) >= PRESENT_HOURS || person.present?.has(index) === true
  const known = (index: number): boolean =>
    person.hours[index] !== null && person.hours[index] !== undefined

  let lastSeen: number | null = null

  for (let index = Math.min(today, days.length - 1); index >= 0; index--) {
    if (came(index)) {
      lastSeen = index
      break
    }
  }

  // Lo de antes de dejarlo: cuánto venía entre semana y en fin de semana.
  const until = lastSeen ?? -1
  let weekdays = 0
  let weekdaysCame = 0
  let weekdayHours = 0
  let weekends = 0
  let weekendsCame = 0

  for (let index = 0; index <= Math.min(until, lastCounted); index++) {
    if (!known(index)) continue
    const day = days[index]

    if (day === undefined) continue
    if (isWeekend(day.weekday)) {
      weekends++
      if (came(index)) weekendsCame++
    } else {
      weekdays++
      weekdayHours += person.hours[index] ?? 0
      if (came(index)) weekdaysCame++
    }
  }

  const perWeekday = weekdays === 0 ? 0 : weekdayHours / weekdays
  const weekendRate = weekends === 0 ? 0 : weekendsCame / weekends
  const attendance = weekdays === 0 ? 0 : Math.round((100 * weekdaysCame) / weekdays)

  // Los días seguidos sin venir, hasta ayer.
  const missed = days
    .slice(until + 1, lastCounted + 1)
    .filter((_, offset) => known(until + 1 + offset))
  const missedWeekdays = missed.filter((day) => !isWeekend(day.weekday)).length
  const reasons: DropoutReason[] = []

  if (person.inExam === true) {
    return {
      status: 'active',
      risk: 0,
      lastSeen,
      missedDays: 0,
      missedWeekdays: 0,
      leftBetween: null,
      leftWeek: null,
      reasons: ['inExam'],
      attendance,
    }
  }

  if (lastSeen !== null && lastSeen >= FINAL_EXAM_DAY) {
    return {
      status: 'active',
      risk: 0,
      lastSeen,
      missedDays: missed.length,
      missedWeekdays,
      leftBetween: null,
      leftWeek: null,
      reasons: ['finished'],
      attendance,
    }
  }

  if (lastSeen === null) {
    // Nunca ha venido: en cuanto ha pasado algún día entre semana.
    const never = missedWeekdays > 0

    return {
      status: never ? 'never' : 'active',
      risk: never ? 100 : 0,
      lastSeen: null,
      missedDays: missed.length,
      missedWeekdays,
      leftBetween: null,
      leftWeek: null,
      reasons: [],
      attendance,
    }
  }

  // Viernes, sábado, domingo y lunes seguidos sin venir.
  const missedWeekend = missed.some(
    (day, offset) =>
      day.weekday === 5 &&
      missed[offset + 3] !== undefined &&
      missed[offset + 3]?.index === day.index + 3,
  )
  const byFriday = tuning.fridayToMonday && missedWeekend
  const missedWeek = missedWeekdays >= tuning.weekMissed
  let lambda = profile

  for (const day of missed) {
    if (isWeekend(day.weekday)) {
      lambda += tuning.weekendWeight * weekendRate
    } else {
      lambda +=
        tuning.weekdayBase +
        tuning.weekdayHours * Math.min(1, perWeekday / Math.max(1, tuning.fullDayHours))
      if (day.weekday === 5) lambda += tuning.fridayExtra
    }
  }

  const gone = byFriday || missedWeek
  const risk = gone ? 100 : Math.round(100 * (1 - Math.exp(-Math.max(0, lambda))))

  if (byFriday) reasons.push('missedWeekend')
  if (missedWeek) reasons.push('missedWeek')
  if (!byFriday && missed.some((day) => day.weekday === 5)) reasons.push('missedFriday')
  if (missed.length > 0 && missedWeekdays === 0) reasons.push('weekendOnly')
  if (missed.length > 0 && perWeekday >= HEAVY_HOURS) reasons.push('heavyUser')
  if (missed.length > 0 && perWeekday <= LIGHT_HOURS) reasons.push('lightUser')
  if (lastSeen >= today - 1) reasons.push('recent')

  const status: DropoutStatus = gone
    ? 'gone'
    : risk >= tuning.likely
      ? 'likely'
      : risk >= tuning.doubt
        ? 'doubt'
        : 'active'
  // Sin ningún día sin venir no hay cuándo lo dejó, aunque su perfil dé riesgo.
  const left = (status === 'gone' || status === 'likely') && missed.length > 0

  return {
    status,
    risk,
    lastSeen,
    missedDays: missed.length,
    missedWeekdays,
    leftBetween: left ? [lastSeen, lastSeen + 1] : null,
    leftWeek: left ? Math.min(4, Math.floor((lastSeen + 1) / 7) + 1) : null,
    reasons,
    attendance,
  }
}

/** Las cuentas de horas de una persona: total, media de los días que vino, primera semana y fin de semana. */
export function hoursOf(
  hours: readonly (number | null)[],
  days: readonly DropoutDay[],
): Pick<DropoutFactors, 'totalHours' | 'avgHours' | 'firstWeekHours' | 'weekendShare'> {
  let total = 0
  let attended = 0
  let firstWeek = 0
  let weekend = 0

  hours.forEach((value, index) => {
    const spent = value ?? 0
    const day = days[index]

    total += spent
    if (spent >= PRESENT_HOURS) attended++
    if (index < 7) firstWeek += spent
    if (day !== undefined && isWeekend(day.weekday)) weekend += spent
  })

  return {
    totalHours: round1(total),
    avgHours: attended === 0 ? 0 : round1(total / attended),
    firstWeekHours: round1(firstWeek),
    weekendShare: total === 0 ? 0 : Math.round((100 * weekend) / total),
  }
}

const round1 = (value: number): number => Math.round(value * 10) / 10

/** Correlación de Pearson de dos listas; 0 si una no varía. */
export function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = Math.min(xs.length, ys.length)

  if (n < 2) return 0

  const mean = (values: readonly number[]) => values.slice(0, n).reduce((a, b) => a + b, 0) / n
  const mx = mean(xs)
  const my = mean(ys)
  let sxy = 0
  let sxx = 0
  let syy = 0

  for (let index = 0; index < n; index++) {
    const dx = (xs[index] ?? 0) - mx
    const dy = (ys[index] ?? 0) - my

    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }

  return sxx === 0 || syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy)
}

const percent = (r: number): number => Math.round(r * 100)

/** Los valores normalizados (media 0, desviación 1); todo 0 si no varían. */
function zScores(values: readonly number[]): number[] {
  const n = values.length
  const mean = values.reduce((a, b) => a + b, 0) / Math.max(1, n)
  const sd = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, n))

  return values.map((value) => (sd === 0 ? 0 : (value - mean) / sd))
}

/**
 * Varios factores juntos: la media de los normalizados, cada uno con el
 * sentido en que va con `target` (si sube con el abandono, suma; si baja, resta).
 */
function combined(columns: readonly (readonly number[])[], target: readonly number[]): number[] {
  const aligned = columns.map((column) => {
    const sign = pearson(column, target) < 0 ? -1 : 1

    return zScores(column).map((value) => value * sign)
  })

  return target.map(
    (_, index) =>
      aligned.reduce((sum, column) => sum + (column[index] ?? 0), 0) / Math.max(1, aligned.length),
  )
}

/** Las correlaciones de todas las parejas de factores, de −100 a 100. */
export function correlationsOf(
  rows: readonly DropoutFactors[],
  factors: readonly DropoutFactorKey[],
): DropoutCorrelation[] {
  const column = (key: DropoutFactorKey) => rows.map((row) => row[key])

  return factors.flatMap((a, i) =>
    factors.slice(i + 1).map((b) => ({ a, b, r: percent(pearson(column(a), column(b))) })),
  )
}

/** Con |r| de esto o más entre ellos, dos factores van juntos (un grupo). */
const GROUP_R = 0.6

/**
 * Los factores comunes frente al abandono (`target`): cada pareja junta y
 * los grupos de factores que van juntos.
 */
export function factorAnalysis(
  rows: readonly DropoutFactors[],
  candidates: readonly DropoutFactorKey[],
  target: DropoutFactorKey,
): { pairs: DropoutPair[]; groups: DropoutGroup[] } {
  const column = (key: DropoutFactorKey) => rows.map((row) => row[key])
  const goal = column(target)
  const alone = new Map(candidates.map((key) => [key, pearson(column(key), goal)]))
  const pairs: DropoutPair[] = candidates
    .flatMap((a, i) =>
      candidates.slice(i + 1).map((b) => {
        const ra = alone.get(a) ?? 0
        const rb = alone.get(b) ?? 0
        const together = pearson(combined([column(a), column(b)], goal), goal)

        return {
          a,
          b,
          between: percent(pearson(column(a), column(b))),
          ra: percent(ra),
          rb: percent(rb),
          together: percent(together),
          gain: percent(Math.abs(together) - Math.max(Math.abs(ra), Math.abs(rb))),
        }
      }),
    )
    .sort((x, y) => Math.abs(y.together) - Math.abs(x.together) || y.gain - x.gain)

  // Grupos: los factores unidos por |r| ≥ 0,6, de dos en adelante.
  const parent = new Map(candidates.map((key) => [key, key]))
  const find = (key: DropoutFactorKey): DropoutFactorKey => {
    let root = key

    while (parent.get(root) !== root) root = parent.get(root) ?? root

    return root
  }

  for (const pair of pairs) {
    if (Math.abs(pair.between) >= GROUP_R * 100) parent.set(find(pair.a), find(pair.b))
  }

  const members = new Map<DropoutFactorKey, DropoutFactorKey[]>()

  for (const key of candidates) members.set(find(key), [...(members.get(find(key)) ?? []), key])

  const groups = [...members.values()]
    .filter((group) => group.length >= 2)
    .map((factors) => ({
      factors,
      together: percent(pearson(combined(factors.map(column), goal), goal)),
    }))
    .sort((x, y) => Math.abs(y.together) - Math.abs(x.together))

  return { pairs, groups }
}

/**
 * Lo que suman a λ los factores de cada persona (`tuning.weights`): su peso
 * por lo que se aparta de la media de la piscina, en desviaciones. Quien no
 * ha venido nunca no entra en la media.
 */
export function profileLambda(
  rows: readonly Pick<DropoutFactors, DropoutWeightKey>[],
  weights: Readonly<Record<DropoutWeightKey, number>>,
): number[] {
  const keys = (Object.keys(weights) as DropoutWeightKey[]).filter((key) => weights[key] !== 0)
  const scores = keys.map((key) => zScores(rows.map((row) => row[key])))

  return rows.map((_, index) =>
    keys.reduce((sum, key, at) => sum + weights[key] * (scores[at]?.[index] ?? 0), 0),
  )
}
