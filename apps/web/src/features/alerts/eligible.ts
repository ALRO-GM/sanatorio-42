import type { CalendarEvent } from '@sanatorio/contracts'

/**
 * `true` si el evento es con otras personas y vas a ir: los que tienen aviso
 * con respuesta y chat. Las franjas de guardia sin reservar y los eventos y
 * exámenes de 42 no lo son.
 */
export function hasRoom(event: CalendarEvent): boolean {
  if (event.joined === false) return false

  return (
    event.id.startsWith('help:booking:') ||
    event.kind === 'therapy' ||
    event.kind === 'board' ||
    event.kind === 'evaluation'
  )
}

/** `true` si la asistencia a ese evento se valida con códigos: pizarras y sesiones de ayuda. */
export function hasCodes(event: CalendarEvent): boolean {
  return event.kind === 'board' || event.id.startsWith('help:booking:')
}

/** Los eventos que avisan antes de empezar: todo lo tuyo, sea o no con más gente. */
export function alerts(event: CalendarEvent): boolean {
  return event.joined !== false && event.kind !== 'event_open'
}
