/**
 * Las vistas del buzón del panel, sin React: qué mensaje va en cada pestaña.
 */

import type { Ticket, TicketCategory, TicketKind } from '@sanatorio/contracts'

/** Los tipos que se pueden elegir al escribir, en el orden del desplegable. */
export const CATEGORIES = [
  'bug',
  'improvement',
  'idea',
  'translation',
  'other',
] as const satisfies readonly TicketCategory[]

/** Los fallos y las traducciones son «algo no va»; lo demás, una mejora. */
export function kindOf(category: TicketCategory): TicketKind {
  return category === 'bug' || category === 'translation' ? 'issue' : 'idea'
}

/**
 * Las secciones de las que se puede escribir: las de las pestañas, la guardia y
 * el expediente. Ni el panel (es de quien administra) ni la sección secreta.
 */
export function reportableSections(sections: readonly { id: string; inNav: boolean }[]): string[] {
  return sections
    .filter((section) => section.inNav || section.id === 'guardia' || section.id === 'expediente')
    .map((section) => section.id)
}

/** La sección que sale elegida: la abierta, si se puede elegir; si no, ninguna (toda la web). */
export function sectionFor(
  open: string,
  sections: readonly { id: string; inNav: boolean }[],
): string | null {
  return reportableSections(sections).includes(open) ? open : null
}

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
