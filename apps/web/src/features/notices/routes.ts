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
      return 'terapia'
  }
}

/** A dónde hay que ir para ver de qué va un aviso. */
export function targetOf(notice: Notice): NoticeTarget {
  switch (notice.kind) {
    case 'ticket_answered':
      return 'inbox'
    case 'ticket_new':
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
    case 'board_changed':
    case 'board_cancelled':
      return 'pizarras'
    case 'group_joined':
    case 'group_closed':
      return 'terapia'
  }
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
