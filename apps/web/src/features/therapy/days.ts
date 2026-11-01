/**
 * Los días de un grupo de terapia, que son fechas concretas (`YYYY-MM-DD`).
 */

import { formatsFor } from '../../shared/i18n/useFormat'

/** La fecha de ese día a mediodía, para que ninguna zona horaria la mueva de día. */
const dateOf = (day: string): Date => new Date(`${day}T12:00:00`)

/** `mar 13 oct`. */
export function shortDay(day: string, lang: string): string {
  return formatsFor(lang).date(dateOf(day), 'weekdayDayMonth')
}

/** Hoy, como `YYYY-MM-DD`, en la hora del navegador. */
export { todayKey as today } from '../../shared/day'
