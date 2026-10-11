/**
 * Los días de un grupo de terapia, que son fechas concretas (`YYYY-MM-DD`).
 */

/** La fecha de ese día a mediodía, para que ninguna zona horaria la mueva de día. */
const dateOf = (day: string): Date => new Date(`${day}T12:00:00`)

/** `mar 13 oct`. */
export function shortDay(day: string, lang: string): string {
  return dateOf(day).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** Hoy, como `YYYY-MM-DD`, en la hora del navegador. */
export function today(): string {
  const date = new Date()
  const pad = (value: number): string => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
