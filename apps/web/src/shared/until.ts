/**
 * Cuánto falta para algo, dicho como lo diría una persona: "3 horas y 20
 * minutos", "5 días y 2 horas", "2 meses y 4 días". Sirve para que quien pone
 * un evento vea de un vistazo si la fecha es la que quería.
 */

import type { Translate } from './i18n'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
/** Un mes, para hablar: treinta días. */
const MONTH = 30 * DAY

/** Con cuánta antelación deja la API poner un evento, en días. */
export const EVENT_HORIZON_DAYS = 62

/** El último día que se puede elegir, como lo entiende `<input type="date">`. */
export function lastDay(now = Date.now()): string {
  const date = new Date(now + EVENT_HORIZON_DAYS * DAY)
  const two = (value: number): string => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`
}

/**
 * @param ms Milisegundos que faltan. Si no falta nada, "ahora mismo".
 */
export function untilText(ms: number, t: Translate): string {
  const unit = (key: string, n: number): string =>
    t(`until.${key}.${n === 1 ? 'one' : 'many'}`, { n })
  const both = (big: string, small: string | null): string =>
    small === null ? big : t('until.and', { a: big, b: small })

  if (ms < MINUTE) return t('until.now')

  if (ms < HOUR) return unit('minute', Math.round(ms / MINUTE))

  if (ms < 2 * DAY) {
    const hours = Math.floor(ms / HOUR)
    const minutes = Math.round((ms - hours * HOUR) / MINUTE)

    return both(unit('hour', hours), minutes === 0 ? null : unit('minute', minutes))
  }

  if (ms < 2 * MONTH) {
    const days = Math.floor(ms / DAY)
    const hours = Math.round((ms - days * DAY) / HOUR)

    return both(unit('day', days), hours === 0 ? null : unit('hour', hours))
  }

  const months = Math.floor(ms / MONTH)
  const days = Math.round((ms - months * MONTH) / DAY)

  return both(unit('month', months), days === 0 ? null : unit('day', days))
}
