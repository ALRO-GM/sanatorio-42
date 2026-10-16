/**
 * Reglas de los avisos de evento, sin base ni reloj: qué hay que contestar.
 */

import type { CalendarKind } from '@sanatorio/contracts'

/**
 * `true` si el evento es con más gente de Sanatorio y vas: hay que decir si vas,
 * si te retrasas o si no.
 *
 * Las correcciones de 42 no: la asistencia la sabe 42 (la corrección se hace o
 * no), y pedir respuesta solo servía para dar por ausente a quien no tenía la
 * web abierta a la media hora. Se avisa antes de empezar y basta.
 */
export function needsReply(event: {
  id: string
  kind: CalendarKind
  joined?: boolean | null
}): boolean {
  if (event.joined === false) return false

  return event.id.startsWith('help:booking:') || event.kind === 'therapy' || event.kind === 'board'
}
