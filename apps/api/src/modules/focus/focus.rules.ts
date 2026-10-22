/**
 * Reglas de las estadísticas del Pomodoro (#80 del buzón), sin base de datos:
 * cómo acabó cada sesión, cuánto tiempo cuenta y cómo se reparte por días y
 * horas, y cómo queda una persona al lado de un tramo de quienes lo usan.
 */

import type { FocusFigures, FocusReason, FocusStats } from '@sanatorio/contracts'

/** Los motivos que se pueden marcar al querer acabar, en el orden de la web. */
export const REASONS = [
  'tired',
  'break',
  'distracted',
  'someone',
  'urgent',
  'done',
  'other',
] as const satisfies readonly FocusReason[]

/** Cómo acabó una sesión, tal como se guarda. `replaced`: se empezó otra encima. */
export type FocusOutcome = 'completed' | 'cancelled' | 'replaced'

/** Una sesión del registro, con los instantes en milisegundos. */
export type FocusSession = {
  login: string
  startedAt: number
  plannedS: number
  endedAt: number | null
  outcome: FocusOutcome | null
  reasons: readonly FocusReason[]
  stays: number
  stayReasons: readonly FocusReason[]
}

/** Una sesión ya leída: cómo acabó (o si sigue) y hasta cuándo cuenta. */
type Settled = { outcome: FocusOutcome | 'running'; endsAt: number }

const HOUR_MS = 3_600_000

/**
 * Cómo acabó una sesión y hasta cuándo cuenta su tiempo.
 *
 * Una sesión sin final guardado que ya pasó su hora llegó a ella: al acabar a
 * su hora nadie avisa a la API (la web puede estar cerrada). Nada cuenta más
 * allá de lo planeado, aunque se parase tarde.
 */
export function settle(session: FocusSession, now: number): Settled {
  const plannedEnd = session.startedAt + session.plannedS * 1000

  if (session.outcome !== null && session.endedAt !== null) {
    return {
      outcome: session.outcome,
      endsAt: Math.max(session.startedAt, Math.min(session.endedAt, plannedEnd)),
    }
  }

  return plannedEnd <= now
    ? { outcome: 'completed', endsAt: plannedEnd }
    : { outcome: 'running', endsAt: Math.max(session.startedAt, now) }
}

const zero = (): FocusFigures => ({
  sessions: 0,
  completed: 0,
  cancelled: 0,
  stayed: 0,
  focusedSeconds: 0,
})

/** Suma una sesión a unas cifras (el tiempo, en milisegundos, aparte). */
function count(into: FocusFigures, session: FocusSession, settled: Settled): void {
  into.sessions += 1
  into.stayed += session.stays
  if (settled.outcome === 'completed') into.completed += 1
  if (settled.outcome === 'cancelled') into.cancelled += 1
}

/** Las cifras de unas sesiones, todas juntas. */
export function figuresOf(sessions: readonly FocusSession[], now: number): FocusFigures {
  const figures = zero()
  let ms = 0

  for (const session of sessions) {
    const settled = settle(session, now)

    count(figures, session, settled)
    ms += settled.endsAt - session.startedAt
  }

  return { ...figures, focusedSeconds: Math.round(ms / 1000) }
}

/** `AAAA-MM-DD` y hora de un instante ya pasado a la hora de quien mira. */
const dayOf = (local: number): string => new Date(local).toISOString().slice(0, 10)
const hourOf = (local: number): number => new Date(local).getUTCHours()

/**
 * Las estadísticas de unas sesiones, por días y por horas en la hora de quien
 * mira. Cada sesión cuenta en el día y la hora en que empezó; su tiempo se
 * reparte por las horas (y los días) que ocupó de verdad, para que una de 90
 * minutos que empieza a las 10:45 llene un poco las 10, las 11 y las 12.
 *
 * @param offset Minutos que hay que sumar a UTC para tener la hora local.
 */
export function summarize(
  sessions: readonly FocusSession[],
  now: number,
  offset: number,
): Omit<FocusStats, 'from' | 'to' | 'segment'> {
  const shift = offset * 60_000
  const days = new Map<string, FocusFigures & { ms: number }>()
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, sessions: 0, ms: 0 }))
  const reasons = new Map<FocusReason, { cancelled: number; stayed: number }>(
    REASONS.map((reason) => [reason, { cancelled: 0, stayed: 0 }]),
  )
  const dayFor = (day: string): FocusFigures & { ms: number } => {
    const found = days.get(day) ?? { ...zero(), ms: 0 }

    days.set(day, found)

    return found
  }

  for (const session of sessions) {
    const settled = settle(session, now)
    const start = session.startedAt + shift

    count(dayFor(dayOf(start)), session, settled)
    const first = hours[hourOf(start)]

    if (first !== undefined) first.sessions += 1

    // El tiempo, hora a hora: corta en cada cambio de hora local.
    for (let at = start, end = settled.endsAt + shift; at < end;) {
      const next = Math.min(end, (Math.floor(at / HOUR_MS) + 1) * HOUR_MS)
      const slot = hours[hourOf(at)]

      if (slot !== undefined) slot.ms += next - at
      dayFor(dayOf(at)).ms += next - at
      at = next
    }

    if (settled.outcome === 'cancelled') {
      for (const reason of session.reasons) {
        const found = reasons.get(reason)

        if (found !== undefined) found.cancelled += 1
      }
    }
    for (const reason of session.stayReasons) {
      const found = reasons.get(reason)

      if (found !== undefined) found.stayed += 1
    }
  }

  return {
    totals: {
      ...figuresOf(sessions, now),
      people: new Set(sessions.map((session) => session.login)).size,
    },
    days: [...days.entries()]
      .filter(([, figures]) => figures.sessions > 0 || figures.ms >= 1000)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([day, { ms, ...figures }]) => ({
        ...figures,
        day,
        focusedSeconds: Math.round(ms / 1000),
      })),
    hours: hours.map(({ hour, sessions: started, ms }) => ({
      hour,
      sessions: started,
      focusedSeconds: Math.round(ms / 1000),
    })),
    reasons: [...reasons.entries()].map(([reason, times]) => ({ reason, ...times })),
  }
}

/** Lo concentrada que está cada persona: sus segundos en esas sesiones. */
export function focusedByLogin(
  sessions: readonly FocusSession[],
  now: number,
): Map<string, number> {
  const out = new Map<string, number>()

  for (const session of sessions) {
    const settled = settle(session, now)

    out.set(
      session.login,
      (out.get(session.login) ?? 0) + (settled.endsAt - session.startedAt) / 1000,
    )
  }

  return out
}

/**
 * La media por persona de unas sesiones: lo que haría alguien «típico» del
 * tramo. Con un decimal, que con pocas personas una media redonda engaña.
 */
export function averageOf(
  sessions: readonly FocusSession[],
  people: number,
  now: number,
): FocusFigures {
  const total = figuresOf(sessions, now)

  if (people === 0) return total

  const mean = (value: number): number => Math.round((value / people) * 10) / 10

  return {
    sessions: mean(total.sessions),
    completed: mean(total.completed),
    cancelled: mean(total.cancelled),
    stayed: mean(total.stayed),
    focusedSeconds: Math.round(total.focusedSeconds / people),
  }
}

/**
 * Qué parte de quienes lo usan se concentra menos que esa persona, de 0 a 100.
 * `null` si no lo ha usado en el periodo (no está en la cola) o si no hay nadie
 * más con quien compararse.
 */
export function positionOf(activity: ReadonlyMap<string, number>, login: string): number | null {
  const mine = activity.get(login)

  if (mine === undefined || activity.size <= 1) return null

  let below = 0

  for (const [other, seconds] of activity) {
    if (other !== login && seconds < mine) below += 1
  }

  return Math.round((below / (activity.size - 1)) * 100)
}
