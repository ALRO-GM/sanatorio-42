/**
 * Cómo te ve ahora el resto: si sales «de guardia» en las listas y si te pueden
 * reservar ayuda. Son dos cosas distintas, y era lo que no se entendía:
 *
 * - Sales de guardia con el interruptor de la cabecera encendido y sentado en un
 *   puesto del campus. Es lo que ve quien busca ayuda ahora mismo.
 * - Te pueden reservar en las medias horas que marques aquí, hasta tu tope del
 *   día, tengas o no el interruptor encendido. Al llegar al tope dejas de salir
 *   para reservar, aunque te queden medias horas marcadas.
 *
 * Sin React: devuelve qué frase toca y con qué cifras, para probarlo.
 */

import type { HelpDay } from '@sanatorio/contracts'

import { SLOT, slotsOf, toMinutes } from './time'

type StatusLine = {
  /** Clave del texto (`help.status.*`) y sus huecos. */
  key: string
  vars: Record<string, string | number>
  /** `ok`: estás; `warn`: casi, falta algo; `off`: no. */
  tone: 'ok' | 'warn' | 'off'
}

/** Minutos marcados que aún no han terminado y no pisan otra cosa del calendario. */
export function minutesLeft(day: Pick<HelpDay, 'windows' | 'busy' | 'now'>): number {
  const now = toMinutes(day.now)
  const busy = slotsOf(day.busy)

  return (
    [...slotsOf(day.windows)].filter((start) => start + SLOT > now && !busy.has(start)).length *
    SLOT
  )
}

/**
 * Las dos frases: la de la guardia y la de las reservas.
 *
 * @param duration Cómo se escribe un rato (`1 h 30 min`).
 */
export function guardStatus(
  day: Pick<HelpDay, 'windows' | 'busy' | 'now' | 'maxMinutes' | 'bookedMinutes' | 'presence'>,
  duration: (minutes: number) => string,
): [duty: StatusLine, booking: StatusLine] {
  const { available, seat } = day.presence
  const duty: StatusLine =
    available && seat !== null
      ? { key: 'help.status.onDuty', vars: { seat }, tone: 'ok' }
      : available
        ? { key: 'help.status.notSeated', vars: {}, tone: 'warn' }
        : { key: 'help.status.offDuty', vars: {}, tone: 'off' }

  const left = minutesLeft(day)
  const room = Math.max(0, day.maxMinutes - day.bookedMinutes)
  const booking: StatusLine =
    left === 0
      ? { key: 'help.status.noSlots', vars: {}, tone: 'off' }
      : room === 0
        ? {
            key: 'help.status.capReached',
            vars: { booked: duration(day.bookedMinutes) },
            tone: 'warn',
          }
        : {
            key: 'help.status.bookable',
            vars: { left: duration(Math.min(room, left)), max: duration(day.maxMinutes) },
            tone: 'ok',
          }

  return [duty, booking]
}
