import type { Notice } from '@sanatorio/contracts'
import type { IconName } from '../../shared/ui/Icon'

/**
 * Dónde lleva un aviso: una sección de la web, el buzón de incidencias o la
 * bandeja de conversaciones del propio buzón.
 */
export type NoticeTarget =
  | 'conversations'
  | 'inbox'
  | 'gestion'
  | 'guardia'
  | 'tablon'
  | 'pizarras'
  | 'terapia'
  | 'calendario'

/** Un icono por familia de avisos, para distinguirlos de un vistazo. */
export function iconOf(notice: Notice): IconName {
  switch (notice.kind) {
    case 'ticket_answered':
    case 'ticket_new':
      return 'buzon'
    case 'chat':
      return 'chat'
    case 'chat_reminder':
      return 'reloj'
    case 'booking_requested':
    case 'booking_accepted':
    case 'booking_declined':
    case 'booking_cancelled':
      return 'guardia'
    case 'doubt_answered':
    case 'doubt_solved':
    case 'proposal_accepted':
    case 'proposal_rejected':
      return 'tablon'
    case 'board_changed':
    case 'board_cancelled':
      return 'pizarras'
    case 'group_joined':
    case 'group_closed':
    case 'group_invite':
      return 'terapia'
    case 'clicker_defense':
      return 'escudo'
  }
}

/** A dónde hay que ir para ver de qué va un aviso. */
export function targetOf(notice: Notice): NoticeTarget {
  switch (notice.kind) {
    case 'ticket_answered':
      return 'inbox'
    case 'ticket_new':
    case 'clicker_defense':
      return 'gestion'
    case 'chat_reminder':
      // Recordar una conversación es llevarte a ella, sea del tipo que sea.
      return 'conversations'
    case 'chat':
      // El chat de un grupo está en su tarjeta; el de un evento, en el calendario.
      // …y una conversación directa, en la bandeja de conversaciones.
      if (notice.ref.startsWith('dm:')) return 'conversations'

      return notice.ref.startsWith('group:') ? 'terapia' : 'calendario'
    case 'booking_requested':
    case 'booking_accepted':
    case 'booking_declined':
    case 'booking_cancelled':
      return 'guardia'
    case 'doubt_answered':
    case 'doubt_solved':
    case 'proposal_accepted':
    case 'proposal_rejected':
      return 'tablon'
    // Una pizarra que cambia o un grupo al que te invitan o en el que entra
    // alguien: al calendario, con el evento abierto para apuntarse (#76).
    case 'board_changed':
    case 'group_joined':
    case 'group_invite':
      return 'calendario'
    case 'board_cancelled':
      return 'pizarras'
    case 'group_closed':
      return 'terapia'
  }
}

/**
 * El evento del calendario que abre un aviso, si lleva a uno: la pizarra
 * (`board:12`) o el grupo (`therapy:5`, que en el calendario es cada uno de
 * sus días: se abre el próximo).
 */
export function calendarEventOf(notice: Notice): string | null {
  if (targetOf(notice) !== 'calendario') return null
  if (notice.ref.startsWith('board:')) return notice.ref
  if (notice.ref.startsWith('group:')) return `therapy:${notice.ref.slice('group:'.length)}`

  return null
}

/** Qué avisos se enseñan: todos, o solo los guardados. */
export type NoticeFilter = 'all' | 'saved'

export function noticesIn<T extends { saved: boolean }>(
  items: readonly T[],
  filter: NoticeFilter,
): T[] {
  return filter === 'saved' ? items.filter((notice) => notice.saved) : [...items]
}

/** Cuántos se irían con «borrar los leídos»: los leídos que no están guardados. */
export function removableCount(items: readonly { read: boolean; saved: boolean }[]): number {
  return items.filter((notice) => notice.read && !notice.saved).length
}
