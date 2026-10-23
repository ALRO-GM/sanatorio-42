/**
 * Hora local de un campus.
 *
 * Una terapia "martes de 16:00 a 18:00" es martes en el campus, no en el
 * servidor, que puede estar en otra zona horaria. `Intl` hace la conversión sin
 * ninguna librería.
 */

type LocalMoment = {
  /** `YYYY-MM-DD` en el campus. */
  day: string
  /** Día de la semana: 1 lunes … 7 domingo. */
  weekday: number
  /** Minutos desde la medianoche local. */
  minutes: number
}

const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }

/**
 * Momento local en una zona horaria.
 *
 * Si la zona no se conoce o no es válida se usa UTC: es mejor fichar con una
 * hora de diferencia que no poder fichar.
 */
export function localMoment(at: number, timeZone: string | undefined): LocalMoment {
  let formatter: Intl.DateTimeFormat

  try {
    formatter = formatterFor(timeZone ?? 'UTC')
  } catch {
    formatter = formatterFor('UTC')
  }

  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(at)).map((part) => [part.type, part.value]),
  )
  // `hour: '2-digit'` con `hourCycle: 'h23'` da "00"-"23", pero algunos motores
  // devuelven "24" a medianoche; el módulo lo deja en 0.
  const hour = Number(parts.hour) % 24

  return {
    day: `${parts.year ?? '1970'}-${parts.month ?? '01'}-${parts.day ?? '01'}`,
    weekday: WEEKDAYS[parts.weekday ?? 'Mon'] ?? 1,
    minutes: hour * 60 + Number(parts.minute),
  }
}

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Minutos desde la medianoche de un `HH:MM`. */
export function minutesOf(time: string): number {
  const [hours, minutes] = time.split(':')

  return Number(hours) * 60 + Number(minutes)
}

/**
 * El instante (ms) en que en una zona horaria son esos minutos de ese día.
 *
 * Es la operación contraria a `localMoment`. `Intl` no la ofrece, así que se
 * parte de suponer que la zona es UTC y se corrige con el desfase que resulta;
 * dos pasadas bastan también en los días de cambio de hora.
 *
 * @param day `YYYY-MM-DD` en esa zona.
 */
export function zonedInstant(day: string, minutes: number, timeZone: string | undefined): number {
  const wanted = Date.parse(`${day}T00:00:00.000Z`) + minutes * 60_000
  let guess = wanted

  for (let pass = 0; pass < 2; pass += 1) {
    const local = localMoment(guess, timeZone)
    const seen = Date.parse(`${local.day}T00:00:00.000Z`) + local.minutes * 60_000

    guess += wanted - seen
  }

  return guess
}

/**
 * Con cuánta antelación se puede poner un evento, en días: dos meses largos.
 * Más allá casi siempre es un error al escribir la fecha (otro año, otro mes),
 * y lo que queda tan lejos no sale en ningún calendario: nadie lo ve ni lo
 * puede quitar.
 */
export const EVENT_HORIZON_DAYS = 62

const DAY_MS = 24 * 60 * 60_000

/** `true` si ese instante cae más allá de lo que se deja reservar. */
export const beyondHorizon = (at: number, now: number): boolean =>
  at - now > EVENT_HORIZON_DAYS * DAY_MS

/** Un instante en ISO 8601. La única forma de escribir fechas en la base. */
export const isoAt = (ms: number): string => new Date(ms).toISOString()

/** El día UTC de un instante, `AAAA-MM-DD`. */
export const dayOf = (ms: number): string => isoAt(ms).slice(0, 10)

/** Principio del día UTC de un instante, en ISO. Para los topes diarios. */
export const startOfDayIso = (at: number): string => `${dayOf(at)}T00:00:00.000Z`
