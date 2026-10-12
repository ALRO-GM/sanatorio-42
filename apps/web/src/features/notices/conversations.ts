/**
 * Lo que la bandeja de conversaciones calcula por su cuenta: qué se ve con cada
 * filtro, a qué hora cae un recordatorio y cómo se pide abrir una conversación
 * desde cualquier parte de la web. Sin React, para poder probarlo solo.
 */

import type { Conversation, ConversationKind } from '@sanatorio/contracts'

/** El id del chat de dos personas: uno solo por pareja, con los logins en orden. */
export const directChatId = (a: string, b: string): string => `dm:${[a, b].sort().join(':')}`

export type StateFilter = 'all' | 'unread' | 'pending'

export type Filters = {
  state: StateFilter
  /** Un tipo, o todos. */
  kind: ConversationKind | 'all'
  /** Un proyecto, o cualquiera. */
  projectId: number | null
}

export const NO_FILTERS: Filters = { state: 'all', kind: 'all', projectId: null }

/** `true` si la conversación se ve con esos filtros. */
export function matches(conversation: Conversation, filters: Filters): boolean {
  const state =
    filters.state === 'all' ||
    (filters.state === 'unread' ? conversation.unread > 0 : conversation.pending)

  return (
    state &&
    (filters.kind === 'all' || conversation.kind === filters.kind) &&
    (filters.projectId === null || conversation.project?.id === filters.projectId)
  )
}

/** Los tipos que hay entre esas conversaciones, en el orden en que se enseñan. */
export function kindsIn(conversations: readonly Conversation[]): ConversationKind[] {
  const order: ConversationKind[] = ['direct', 'group', 'board', 'help', 'event']

  return order.filter((kind) => conversations.some((entry) => entry.kind === kind))
}

/** Los proyectos que alguien ha puesto a sus conversaciones, por nombre y sin repetir. */
export function projectsIn(conversations: readonly Conversation[]): { id: number; name: string }[] {
  const found = new Map<number, string>()

  for (const { project } of conversations) {
    if (project !== null) found.set(project.id, project.name)
  }

  return [...found].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
}

export type RemindPreset = 'hour' | 'tomorrow' | 'monday'

/** La hora a la que se recuerdan las cosas "mañana" o "el lunes". */
const MORNING = 9

/**
 * Cuándo cae un recordatorio, en la hora de quien lo pide.
 *
 * - `hour`: dentro de una hora.
 * - `tomorrow`: mañana a las nueve.
 * - `monday`: el próximo lunes a las nueve. Si hoy es lunes, el de la semana
 *   que viene: "el lunes" nunca es hoy.
 */
export function remindTime(preset: RemindPreset, now: Date): Date {
  if (preset === 'hour') return new Date(now.getTime() + 60 * 60_000)

  const at = new Date(now)
  // `getDay`: domingo es 0 y lunes, 1.
  const days = preset === 'tomorrow' ? 1 : (8 - at.getDay()) % 7 || 7

  at.setDate(at.getDate() + days)
  at.setHours(MORNING, 0, 0, 0)

  return at
}

const OPEN_EVENT = 'sanatorio:open-chat'

/**
 * Pide abrir una conversación. La bandeja vive en el buzón de la cabecera, y
 * quien quiere abrirla (un puesto del mapa, un expediente) no tiene por qué
 * saber dónde está: lanza el aviso y la cabecera lo recoge.
 */
export function openChat(chatId: string): void {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: chatId }))
}

/** Escucha las peticiones de `openChat`. Devuelve cómo dejar de escuchar. */
export function onOpenChat(listener: (chatId: string) => void): () => void {
  const handle = (event: Event): void => {
    if (event instanceof CustomEvent && typeof event.detail === 'string') listener(event.detail)
  }

  window.addEventListener(OPEN_EVENT, handle)

  return () => {
    window.removeEventListener(OPEN_EVENT, handle)
  }
}
