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
 * - `booking_*`: te han pedido ayuda, o han aceptado, rechazado o anulado una reserva.
 * - `doubt_answered` / `doubt_solved`: han respondido a tu duda, o tu respuesta la resolvió.
 * - `proposal_*`: han validado o rechazado un cambio que propusiste para una guía.
 * - `board_changed` / `board_cancelled`: una pizarra a la que vas ha cambiado o se ha cancelado.
 * - `group_joined` / `group_closed`: alguien se ha apuntado a tu grupo de terapia, o se ha cerrado uno tuyo.
 */
export type NoticeKind =
  | 'ticket_answered'
  | 'ticket_new'
  | 'chat'
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
  quota: QuotaStatus
}
