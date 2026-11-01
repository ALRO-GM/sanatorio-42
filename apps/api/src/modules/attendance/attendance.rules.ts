/**
 * Reglas de la asistencia con código: cuándo vale y cuánto tiempo cuenta. Son
 * cuentas sin base de datos, para poder probar los bordes uno a uno.
 *
 * Hay un solo código por evento, el de llegada (pedido por Alberto,
 * 2026-11-01): pedir otro al terminar complicaba que te lo dieran, y lo que se
 * quiere premiar es el esfuerzo de ir. Vale todo el rato que dura el evento y
 * cuenta desde que lo escribes hasta la hora de fin. Lo que evita la trampa de
 * apuntarse al ver una pizarra en marcha es que no se puede reservar plaza en
 * una que ya ha empezado (`boards`).
 *
 * Estas horas se quieren enseñar a terceros (el staff de 42), así que la regla
 * es siempre la más prudente: ante la duda, se cuenta menos.
 */

const MINUTE = 60_000

/** Lo que se puede validar antes de la hora de inicio: quien llega antes no espera. */
const MARGIN_MS = 10 * MINUTE

/** Códigos equivocados que puede escribir una persona en un evento. */
export const MAX_FAILED_ATTEMPTS = 5

/** Horario previsto de un evento, en milisegundos. */
type Schedule = { startsAt: number; endsAt: number }

type CodeWindow = {
  /** Desde cuándo vale el código. */
  from: number
  /** Hasta cuándo vale: la hora de fin. */
  until: number
}

/** Cuándo vale el código de un evento con ese horario. */
export function windowOf({ startsAt, endsAt }: Schedule): CodeWindow {
  return { from: startsAt - MARGIN_MS, until: endsAt }
}

/** `true` si el evento ya no admite el código: lo que haya validado es definitivo. */
export function closed(schedule: Schedule, at: number): boolean {
  return at > windowOf(schedule).until
}

type ValidSpan = { from: number; to: number; minutes: number }

/**
 * El rato que cuenta para quien escribió el código en `arrivedAt`: desde
 * entonces hasta la hora de fin.
 *
 * Quien llega antes de la hora empieza a contar a la hora (validar un rato
 * antes no suma ese rato). Los minutos se redondean hacia abajo.
 */
export function validSpan(arrivedAt: number, schedule: Schedule): ValidSpan {
  const from = Math.min(schedule.endsAt, Math.max(arrivedAt, schedule.startsAt))
  const to = schedule.endsAt

  return { from, to, minutes: Math.max(0, Math.floor((to - from) / MINUTE)) }
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
