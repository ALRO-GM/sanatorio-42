/**
 * Franjas del día en una zona horaria: «de 02:00 a 06:00 en Madrid».
 *
 * Aparte de `modules/replica/budget.ts`, que es quien las usa, porque el
 * entorno (`config/env.ts`) también las valida al arrancar.
 */

/** Una franja, en minutos desde las 00:00. Si `from > to`, cruza la medianoche. */
export type NightWindow = { from: number; to: number }

/**
 * Lee `02:00-06:00`. Vacío u `off`: sin franja. Puede cruzar la medianoche
 * (`23:30-06:00`).
 *
 * @throws {Error} Si no tiene esa forma o empieza y acaba a la misma hora.
 */
export function parseNightWindow(raw: string): NightWindow | null {
  const text = raw.trim().toLowerCase()

  if (text === '' || text === 'off') {
    return null
  }

  const [, h1, m1, h2, m2] = (/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(text) ?? []).map(
    Number,
  )
  const minutesOf = (hours = NaN, minutes = NaN): number =>
    hours <= 23 && minutes <= 59 ? hours * 60 + minutes : NaN
  const from = minutesOf(h1, m1)
  const to = minutesOf(h2, m2)

  if (Number.isNaN(from) || Number.isNaN(to) || from === to) {
    throw new Error(`Franja no válida: «${raw}». Se espera HH:MM-HH:MM.`)
  }

  return { from, to }
}

/** La franja como se escribe: `02:00-06:00`, o `null` si no hay. */
export function formatWindow(window: NightWindow | null): string | null {
  const clock = (minutes: number): string =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

  return window === null ? null : `${clock(window.from)}-${clock(window.to)}`
}

/** `true` si la zona horaria existe. */
export function isTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone })
    return true
  } catch {
    return false
  }
}

const formatters = new Map<string, Intl.DateTimeFormat>()

/** Minutos desde las 00:00 en esa zona horaria, con el cambio de hora incluido. */
export function minutesOfDay(now: number, timeZone: string): number {
  let format = formatters.get(timeZone)

  if (format === undefined) {
    format = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    formatters.set(timeZone, format)
  }

  const parts = format.formatToParts(now)
  const part = (type: string): number => Number(parts.find((entry) => entry.type === type)?.value)

  return part('hour') * 60 + part('minute')
}

/** `true` si ese instante cae en la franja, en esa zona horaria. */
export function inWindow(now: number, window: NightWindow, timeZone: string): boolean {
  const minute = minutesOfDay(now, timeZone)

  return window.from < window.to
    ? minute >= window.from && minute < window.to
    : minute >= window.from || minute < window.to
}
