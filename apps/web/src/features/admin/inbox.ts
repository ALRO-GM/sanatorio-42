/**
 * Las vistas del buzón del panel, sin React: qué mensaje va en cada pestaña.
 */

import type { Ticket } from '@sanatorio/contracts'

export const INBOX_VIEWS = ['pending', 'done'] as const

export type InboxView = (typeof INBOX_VIEWS)[number]

/**
 * Los mensajes de una pestaña, del más nuevo al más viejo. Pendiente es lo que
 * nadie ha respondido; lo respondido (aunque siga abierto a más respuestas) y lo
 * cerrado van juntos en la otra.
 */
export function ticketsIn(tickets: readonly Ticket[], view: InboxView): Ticket[] {
  return tickets
    .filter((ticket) => (ticket.status === 'open') === (view === 'pending'))
    .sort((a, b) => b.id - a.id)
}
