/**
 * Reglas de la asistencia con códigos: cuándo vale cada código y cuánto tiempo
 * cuenta. Son cuentas sin base de datos, para poder probar los bordes uno a uno.
 *
 * Estas horas se quieren enseñar a terceros (el staff de 42), así que la regla
 * es siempre la más prudente: ante la duda, se cuenta menos.
 */

const MINUTE = 60_000

/** Lo que se puede validar antes de la hora de inicio, y lo que cuenta después de la de fin. */
export const MARGIN_MS = 10 * MINUTE

/**
 * Retraso máximo con el que aún se puede validar el código de inicio. En un
 * evento corto es la mitad de lo que dura: llegar con media sesión pasada no es
 * haber ido.
 */
export const MAX_LATE_MS = 30 * MINUTE

/** Tiempo que tiene que pasar entre el código de inicio y el de fin. */
export const MIN_STAY_MS = 10 * MINUTE

/** Lo que se espera el código de fin después de la hora de fin, para quien se despista. */
export const END_GRACE_MS = 30 * MINUTE

/** Códigos equivocados que puede escribir una persona en un evento. */
export const MAX_FAILED_ATTEMPTS = 5

/** Horario previsto de un evento, en milisegundos. */
export type Schedule = { startsAt: number; endsAt: number }

export type CodeWindow = {
  /** Desde cuándo vale el código de inicio. */
  startFrom: number
  /** Hasta cuándo vale el código de inicio. */
  startUntil: number
  /** Hasta cuándo vale el código de fin. */
  endUntil: number
}

/** Cuándo vale cada código de un evento con ese horario. */
export function windowOf({ startsAt, endsAt }: Schedule): CodeWindow {
  return {
    startFrom: startsAt - MARGIN_MS,
    startUntil: startsAt + Math.min(MAX_LATE_MS, Math.floor((endsAt - startsAt) / 2)),
    endUntil: endsAt + END_GRACE_MS,
  }
}

/** `true` si el evento ya no admite más códigos: lo que haya validado es definitivo. */
export function closed(schedule: Schedule, at: number): boolean {
  return at > windowOf(schedule).endUntil
}

export type ValidSpan = { from: number; to: number; minutes: number }

/**
 * El rato que cuenta entre dos códigos.
 *
 * Se recorta al horario del evento con el margen (quien valida un cuarto de
 * hora antes no gana un cuarto de hora) y nunca suma más que la duración
 * prevista. Los minutos se redondean hacia abajo.
 */
export function validSpan(startedAt: number, endedAt: number, schedule: Schedule): ValidSpan {
  const from = Math.max(startedAt, schedule.startsAt - MARGIN_MS)
  const to = Math.max(from, Math.min(endedAt, schedule.endsAt + MARGIN_MS))
  const scheduled = Math.floor((schedule.endsAt - schedule.startsAt) / MINUTE)

  return { from, to, minutes: Math.max(0, Math.min(scheduled, Math.floor((to - from) / MINUTE))) }
}

/**
 * Minutos en los que hubo al menos una persona validada: es el tiempo de quien
 * organiza. Los ratos que se pisan no se cuentan dos veces.
 */
export function unionMinutes(spans: readonly { from: number; to: number }[]): number {
  let total = 0
  let end = -Infinity

  for (const span of [...spans].sort((a, b) => a.from - b.from)) {
    if (span.to > end) {
      total += span.to - Math.max(span.from, end)
      end = span.to
    }
  }

  return Math.floor(total / MINUTE)
}
