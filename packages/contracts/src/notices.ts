/**
 * El buzón de avisos: todo lo que alguien tiene que saber porque otra persona
 * ha hecho algo que le toca (le han respondido, le han reservado, le han
 * escrito en un chat…).
 */

import type { QuotaStatus } from './replica.js'

/**
 * Qué ha pasado. El texto lo pone la web a partir de esto, en su idioma.
 *
 * - `ticket_answered`: han respondido a lo que mandaste al buzón de incidencias.
 * - `ticket_new`: alguien ha mandado una incidencia, sugerencia o denuncia (solo admins).
 * - `chat`: mensajes nuevos en el chat de un evento o de un grupo en el que estás.
 * - `chat_reminder`: pediste que se te recordara responder a una conversación, y ha llegado la hora.
 * - `booking_*`: te han pedido ayuda, o han aceptado, rechazado o anulado una reserva.
 * - `doubt_answered` / `doubt_solved`: han respondido a tu duda, o tu respuesta la resolvió.
 * - `proposal_*`: han validado o rechazado un cambio que propusiste para una guía.
 * - `board_changed` / `board_cancelled`: una pizarra a la que vas ha cambiado o se ha cancelado.
 * - `group_joined` / `group_closed`: alguien se ha apuntado a tu grupo de terapia, o se ha cerrado uno tuyo.
 * - `group_invite`: han abierto un grupo de terapia de un proyecto que estás haciendo.
 * - `clicker_defense`: alguien ha contestado a una revisión de trampas de Code Clicker (solo admins).
 */
export type NoticeKind =
  | 'ticket_answered'
  | 'ticket_new'
  | 'chat'
  | 'chat_reminder'
  | 'booking_requested'
  | 'booking_accepted'
  | 'booking_declined'
  | 'booking_cancelled'
  | 'doubt_answered'
  | 'doubt_solved'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'board_changed'
  | 'board_cancelled'
  | 'group_joined'
  | 'group_closed'
  | 'group_invite'
  | 'clicker_defense'

export type Notice = {
  id: number
  kind: NoticeKind
  /** De qué va: `ticket:5`, `board:12`, `help:booking:3`, `group:2`, `doubt:9`. */
  ref: string
  /** Quién lo ha provocado, si es alguien. */
  from: string | null
  /** El título, el asunto o un trozo del mensaje. */
  text: string | null
  /** Cuántas veces ha pasado sin que lo leas (mensajes nuevos de un chat). */
  count: number
  /** Cuándo fue la última vez (ISO-8601). */
  at: string
  read: boolean
  /** `true` si lo has guardado: no se borra con «borrar los leídos». */
  saved: boolean
}

/** `GET /notices`: tu buzón, lo más reciente primero. */
export type Notices = {
  unread: number
  items: Notice[]
}

/**
 * `GET /pulse`: lo que la web pregunta cada poco para saber si hay algo nuevo,
 * en una sola petición: los avisos sin leer y cómo anda la cuota de 42.
 */
export type Pulse = {
  unread: number
  /** Comunicados de quien administra que tienes por leer: salen en pantalla. */
  broadcasts: number
  /** Revisiones de trampas de Code Clicker por contestar: sale una ventana que no se salta. */
  clickerReviews: number
  /** Peticiones de ayuda por contestar y rechazos sin ver: también en una ventana. */
  help: number
  quota: QuotaStatus
}
