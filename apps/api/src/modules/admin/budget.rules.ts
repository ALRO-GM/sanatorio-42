/**
 * Presupuesto de peticiones: cuánto se puede servir hoy, esta hora y a cada
 * persona. Son cuentas sin base de datos, para poder probarlas una a una.
 *
 * La idea es no llegar nunca a un máximo que deje la web parada horas o días.
 * Por eso nada es fijo: lo de hoy sale de lo que queda del mes, lo de esta hora
 * de lo que queda del día, y lo de cada persona de cuánta gente hay.
 *
 * Los días y las horas van en UTC, como `request_stats`.
 */

import type { BudgetSettings } from '@sanatorio/contracts'

import { periodOf } from '../../core/period.js'

export { periodOf } from '../../core/period.js'

const DAY = 24 * 60 * 60_000

/**
 * De fábrica: lo que una máquina pequeña sirve con holgura (30 000 a la hora) y
 * el tráfico de salida mensual de la capa gratuita de Oracle (10 TB).
 */
export const DEFAULT_BUDGET: BudgetSettings = {
  dailyRequests: 720_000,
  monthlyBytes: 10_000_000_000_000,
  renewDay: 1,
  share: 0.85,
  minPerPerson: 240,
  maxPerPerson: 3000,
  saving: false,
}

/** En modo ahorro todo se queda en esta parte de lo normal. */
export const SAVING_FACTOR = 0.25

/** Lo que pesa una respuesta, mientras no haya datos del mes para saberlo. */
const DEFAULT_BYTES_PER_REQUEST = 20_000

/** Peticiones a partir de las que el peso medio del mes ya es de fiar. */
const ENOUGH_REQUESTS = 1000

export type DayPlan = {
  /** Peticiones que se pueden servir hoy, ya con el colchón y el modo ahorro. */
  requests: number
  /** Qué manda hoy: el tope diario o lo que queda del mes. */
  limitedBy: 'day' | 'month'
}

/**
 * Lo que se puede servir hoy.
 *
 * El límite mensual es de bytes (tráfico de salida), no de peticiones: lo que
 * queda del mes se reparte entre los días que faltan para que se renueve y se
 * pasa a peticiones con lo que viene pesando cada una este mes.
 */
export function planDay(
  settings: BudgetSettings,
  used: { bytesPeriod: number; requestsPeriod: number },
  at: number,
): DayPlan {
  let byMonth = Infinity

  if (settings.monthlyBytes !== null) {
    const perRequest =
      used.requestsPeriod >= ENOUGH_REQUESTS
        ? Math.max(1, used.bytesPeriod / used.requestsPeriod)
        : DEFAULT_BYTES_PER_REQUEST
    const bytesLeft = Math.max(0, settings.monthlyBytes - used.bytesPeriod)

    byMonth = bytesLeft / periodOf(at, settings.renewDay).daysLeft / perRequest
  }

  const limitedBy = byMonth < settings.dailyRequests ? 'month' : 'day'
  const allowed = Math.min(settings.dailyRequests, byMonth)

  return {
    requests: Math.floor(allowed * settings.share * (settings.saving ? SAVING_FACTOR : 1)),
    limitedBy,
  }
}

/**
 * Lo que toca esta hora: lo que queda del día entre las horas que faltan,
 * contando esta. Lo que no se gasta en una hora tranquila queda para las demás.
 *
 * @param usedBeforeHour Peticiones servidas hoy antes de que empezara esta hora.
 */
export function planHour(dayRequests: number, usedBeforeHour: number, at: number): number {
  const hoursLeft = 24 - new Date(at).getUTCHours()

  return Math.floor(Math.max(0, dayRequests - usedBeforeHour) / hoursLeft)
}

/**
 * El tope de cada persona esta hora: lo de la hora entre quienes están
 * conectados, sin bajar del mínimo ni pasar del máximo. El mínimo se respeta
 * aunque no quede presupuesto: es lo que evita que la web se quede colgada.
 */
export function perPerson(settings: BudgetSettings, hourRequests: number, active: number): number {
  const max = settings.saving
    ? Math.max(settings.minPerPerson, Math.floor(settings.maxPerPerson * SAVING_FACTOR))
    : settings.maxPerPerson

  return Math.max(
    settings.minPerPerson,
    Math.min(max, Math.floor(hourRequests / Math.max(1, active))),
  )
}

/** Peticiones con las que acabaría el día si sigue al ritmo que lleva. */
export function forecast(usedToday: number, at: number): number {
  const elapsed = (at % DAY) / DAY

  // En la primera hora del día el ritmo aún no dice nada: se mide como si ya hubiera pasado.
  return Math.round(usedToday / Math.max(1 / 24, elapsed))
}
