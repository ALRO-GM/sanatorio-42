/**
 * El abandono de la piscina (pedido por Alberto el 2026-11-06,
 * `docs/abandono.md`): quién de los piscineros de una piscina ha dejado de
 * venir a los ordenadores, con qué probabilidad, cuándo, y con qué se
 * relaciona (horas, aislamiento, correcciones, proyectos).
 *
 * `GET /stats/dropout?start=YYYY-MM-DD`: lo ve quien administra, la vista sin
 * límites del dueño y un piscinero si el panel lo permite (`abandono`).
 */

/**
 * - `gone`: abandono confirmado (faltó viernes, sábado, domingo y lunes, o
 *   cinco días entre semana seguidos).
 * - `likely`: probable (riesgo del 70 % o más).
 * - `doubt`: en duda (del 35 % al 70 %).
 * - `active`: sigue viniendo.
 * - `never`: no ha venido nunca a un ordenador desde que empezó.
 */
export type DropoutStatus = 'gone' | 'likely' | 'doubt' | 'active' | 'never'

/** Un día de la piscina, en la hora del campus. */
export type DropoutDay = {
  /** `YYYY-MM-DD` en el campus. */
  day: string
  /** 1 lunes … 7 domingo. */
  weekday: number
  /** Día de piscina, desde 0 (el primero). */
  index: number
  /** Semana de piscina, de 1 a 4 (5: lo que pasa después). */
  week: number
}

/**
 * Lo que se mide de cada piscinero, para la tabla, las gráficas y las
 * correlaciones (`DropoutFactorKey`).
 */
export type DropoutFactors = {
  /** Probabilidad de abandono, de 0 a 100. */
  risk: number
  /** 1 si el abandono está confirmado (`gone`), 0 si no. */
  gone: number
  /** Horas en los ordenadores en toda la piscina. */
  totalHours: number
  /** Horas de media los días que vino. */
  avgHours: number
  /** Horas de la primera semana (días 0 a 6). */
  firstWeekHours: number
  /** De los días entre semana que han pasado (hasta que lo dejó), en cuántos vino (0–100). */
  attendance: number
  /** Qué parte de sus horas fue en fin de semana (0–100). */
  weekendShare: number
  /** Qué parte de sus horas estuvo sin nadie cerca (0–100), de la red de asientos. */
  isolation: number
  /** Con cuántas personas se sentó cerca. */
  partners: number
  /** Correcciones que hizo. */
  given: number
  /** Correcciones que recibió. */
  received: number
  /** Proyectos de la piscina aprobados (Shell 00 … C 13). */
  passed: number
}

export type DropoutFactorKey = keyof DropoutFactors

/** Por qué tiene ese riesgo, para explicarlo en la ficha. */
export type DropoutReason =
  /** Faltó al viernes de examen. */
  | 'missedFriday'
  /** Faltó de viernes a lunes: abandono confirmado. */
  | 'missedWeekend'
  /** Faltó cinco días entre semana seguidos: abandono confirmado. */
  | 'missedWeek'
  /** Venía muchas horas y ha dejado de venir: más raro que en quien venía poco. */
  | 'heavyUser'
  /** Venía poco y a ratos: un día sin venir dice poco. */
  | 'lightUser'
  /** Solo ha faltado el fin de semana: no cuenta. */
  | 'weekendOnly'
  /** Vino hoy o ayer. */
  | 'recent'
  /** Llegó hasta el examen final: terminó la piscina. */
  | 'finished'
  /** Está en el examen de hoy o lo ha hecho: no ha abandonado. */
  | 'inExam'

export type DropoutPerson = {
  login: string
  image: string | null
  status: DropoutStatus
  /** Horas de cada día de `DropoutReport.days`; `null` los que aún no han llegado. */
  hours: (number | null)[]
  /**
   * El último día que vino (`YYYY-MM-DD`), o `null` si nunca. Vino = 15 min en
   * un puesto, un examen o una corrección ese día.
   */
  lastSeen: string | null
  /** Días seguidos sin venir hasta ayer (todos, también fines de semana). */
  missedDays: number
  /** De esos, los que eran entre semana. */
  missedWeekdays: number
  /**
   * Cuándo lo dejó: entre su último día y el siguiente (`[último, siguiente]`).
   * Solo con el abandono confirmado o probable; `null` en lo demás.
   */
  leftBetween: [string, string] | null
  /** Semana de piscina (1–4) en que lo dejó; `null` sin abandono. */
  leftWeek: number | null
  reasons: DropoutReason[]
  factors: DropoutFactors
}

/** Una correlación entre dos factores: de −100 a 100 (Pearson × 100). */
export type DropoutCorrelation = { a: DropoutFactorKey; b: DropoutFactorKey; r: number }

/**
 * Dos factores juntos (la media de los dos, normalizados y con el mismo
 * sentido) frente al abandono: si juntos explican más que cada uno por
 * separado.
 */
export type DropoutPair = {
  a: DropoutFactorKey
  b: DropoutFactorKey
  /** Cuánto se parecen entre ellos (−100…100). */
  between: number
  /** La de cada uno con el abandono (−100…100). */
  ra: number
  rb: number
  /** La de los dos juntos con el abandono (−100…100). */
  together: number
  /** Cuánto gana juntarlos: |juntos| − el mayor |por separado|, en puntos. */
  gain: number
}

/** Un grupo de factores que van juntos (|r| ≥ 60 entre ellos) y su relación con el abandono. */
export type DropoutGroup = {
  factors: DropoutFactorKey[]
  /** La del grupo junto con el abandono (−100…100). */
  together: number
}

/** Los factores que pueden sumar o restar al riesgo (`DropoutTuning.weights`). */
export type DropoutWeightKey =
  | 'totalHours'
  | 'avgHours'
  | 'firstWeekHours'
  | 'attendance'
  | 'weekendShare'
  | 'isolation'
  | 'partners'
  | 'given'
  | 'received'
  | 'passed'

/**
 * Cómo se calcula el riesgo, para ajustarlo a mano y ver al momento cómo
 * cambia todo (pedido por Alberto el 2026-11-06). Va en la consulta de
 * `GET /stats/dropout`; lo que no se manda, de fábrica (`defaults`).
 *
 * El riesgo es `1 − e^(−λ)`. Cada día sin venir suma a λ: entre semana,
 * `weekdayBase` más `weekdayHours` por las horas que venía (entero con
 * `fullDayHours` o más); el viernes, además `fridayExtra`; en fin de semana,
 * `weekendWeight` por la parte de fines de semana que venía. Cada factor de
 * `weights` suma su peso por lo que se aparta esa persona de la media de su
 * piscina (en desviaciones): con peso positivo, tener más sube el riesgo; con
 * negativo, lo baja.
 */
export type DropoutTuning = {
  weekdayBase: number
  weekdayHours: number
  fullDayHours: number
  fridayExtra: number
  weekendWeight: number
  /** Días entre semana seguidos sin venir que ya son abandono confirmado. */
  weekMissed: number
  /** Si faltar de viernes a lunes es abandono confirmado. */
  fridayToMonday: boolean
  /** Desde qué riesgo es probable (`likely`) y desde cuál en duda (`doubt`), 0–100. */
  likely: number
  doubt: number
  weights: Record<DropoutWeightKey, number>
}

/** Cuánta gente hay en cada estado (con los ajustes de ahora). */
export type DropoutCounts = {
  people: number
  gone: number
  likely: number
  doubt: number
  active: number
  never: number
  /** En el examen hoy (dentro de `active`). */
  inExam: number
}

export type DropoutReport = {
  /** Los ajustes con que se ha calculado y los de fábrica. */
  tuning: DropoutTuning
  defaults: DropoutTuning
  /** Los totales, con la gente que ves. */
  counts: DropoutCounts
  campus: string | null
  /** El primer día de la piscina que se mira (`YYYY-MM-DD`), o `null` sin piscina. */
  start: string | null
  /** Las piscinas que se pueden elegir (su primer día y cuánta gente). */
  pools: { start: string; people: number }[]
  /** Del primer día de piscina hasta hoy (como mucho, la semana después del examen final). */
  days: DropoutDay[]
  /** El día de hoy en el campus (`YYYY-MM-DD`): no cuenta como falta, aún no ha acabado. */
  today: string
  people: DropoutPerson[]
  /** Los factores, en el orden de la tabla de correlaciones. */
  factors: DropoutFactorKey[]
  /** Todas las parejas de `factors` (sin la diagonal), entre la gente que ha venido alguna vez. */
  correlations: DropoutCorrelation[]
  /** Las parejas de factores frente al abandono confirmado, de más a menos relación. */
  pairs: DropoutPair[]
  groups: DropoutGroup[]
  /** Con cuánta gente se han hecho las correlaciones. */
  sample: number
}

/**
 * El abandono de una piscina en cifras, para compararla con otras
 * (`GET /stats/dropout/compare`). El eje es el día de piscina (0 el primero),
 * no la fecha: así se pueden poner varias juntas.
 */
export type DropoutPoolSummary = {
  /** Su primer día (`YYYY-MM-DD`); `null` en el total de las elegidas. */
  start: string | null
  counts: DropoutCounts
  /**
   * El % de la piscina que sigue al acabar cada día de piscina (0…28): sin
   * contar a quien lo dejó (confirmado) antes. `null` los días que aún no han pasado.
   */
  staying: (number | null)[]
  /** Lo mismo, quitando también a los probables. */
  stayingLikely: (number | null)[]
  /** Abandonos confirmados y probables por semana de piscina (1–4: índices 0–3). */
  byWeek: { gone: number[]; likely: number[] }
  /** Por cambio de día: 0 = lunes → martes … 6 = domingo → lunes. */
  byWeekday: { gone: number[]; likely: number[] }
  /** Medias de quien lo dejó (confirmado o probable) y de quien sigue. */
  leaving: DropoutAverages
  remaining: DropoutAverages
  /** Cuántas horas de puestos hay copiadas de esta piscina: con 0, faltan datos. */
  sessionHours: number
}

/** Medias de un grupo de piscineros. */
export type DropoutAverages = {
  people: number
  avgHours: number | null
  totalHours: number | null
  firstWeekHours: number | null
  attendance: number | null
  isolation: number | null
  given: number | null
  received: number | null
  passed: number | null
  /** Día de piscina medio en que lo dejaron (solo de quien lo dejó). */
  leftDay: number | null
}

/**
 * `GET /stats/dropout/compare?starts=a,b,…` (con los mismos ajustes que
 * `/stats/dropout`): cada piscina elegida y todas juntas.
 */
export type DropoutComparison = {
  pools: DropoutPoolSummary[]
  /** Todas las elegidas juntas. */
  overall: DropoutPoolSummary
  /** Las piscinas que se pueden elegir (las últimas 10). */
  available: { start: string; people: number }[]
  /** Hasta qué día de piscina va el eje de `staying`. */
  lastDay: number
  tuning: DropoutTuning
}
