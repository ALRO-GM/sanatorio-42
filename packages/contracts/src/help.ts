import type { ReactionKind } from './profile.js'

/** Una franja del día, en la hora local del campus. `HH:MM`, en medias horas. */
export type TimeRange = {
  start: string
  end: string
}

/**
 * Cómo ayudó quien ayudaba. Lo elige quien recibió la ayuda.
 *
 * No es una nota: son cuatro formas de ayudar, ninguna mejor que otra.
 */
export type HelperTag = ReactionKind

/**
 * Cómo llegó quien pedía ayuda. Lo elige quien ayudó.
 *
 * Tampoco es una nota: describe la sesión.
 * - `prepared`: traía la duda trabajada.
 * - `curious`: preguntó hasta entenderlo.
 * - `autonomous`: con una pista lo sacó por su cuenta.
 * - `basics`: hubo que empezar por la base.
 */
export type RequesterTag = 'prepared' | 'curious' | 'autonomous' | 'basics'

export type BookingStatus =
  /** Pedida; falta que quien ayuda la acepte. */
  'pending' | 'confirmed' | 'declined' | 'cancelled'

/** Una reserva de ayuda, vista por una de las dos personas. */
export type Booking = {
  id: number
  helper: string
  requester: string
  /** La otra persona, con su foto. */
  peer: { login: string; image: string | null }
  /** `helper` si quien pregunta es quien ayuda; `requester` si es quien la pidió. */
  role: 'helper' | 'requester'
  projectId: number | null
  projectName: string | null
  /** Día local del campus, `YYYY-MM-DD`. */
  day: string
  start: string
  end: string
  note: string | null
  status: BookingStatus
  /** `true` si la franja ya ha terminado. */
  finished: boolean
  /** `true` si se vio a las dos personas en el campus durante la franja. */
  verified: boolean
  /** `true` si quien pregunta ya ha valorado. */
  ratedByMe: boolean
  /** `true` si la otra persona ya ha valorado. */
  ratedByPeer: boolean
  /** XP que se llevó quien ayudaba, o `null` si aún no se ha repartido. */
  xp: number | null
}

/** `GET /help/today`: tu guardia de hoy. */
export type HelpDay = {
  /** Día local del campus. */
  day: string
  /** Hora local del campus ahora, `HH:MM`. */
  now: string
  /** Franjas en las que te ofreces hoy. */
  windows: TimeRange[]
  /** Tope de minutos que quieres ayudar hoy. */
  maxMinutes: number
  /**
   * Lo que ya tienes hoy en el calendario: correcciones, exámenes y eventos de
   * 42 a los que vas, terapias y pizarras. Mientras dura no se te puede reservar
   * ayuda, aunque caiga dentro de una franja que hayas abierto.
   */
  busy: TimeRange[]
  /** Minutos ya reservados (pendientes o aceptados). */
  bookedMinutes: number
  /** Reservas de hoy y las anteriores que aún esperan tu valoración. */
  bookings: Booking[]
  /** `true` si tienes alguna sesión terminada sin valorar: hasta entonces no puedes reservar ni ofrecerte. */
  mustRate: boolean
  /** Personas a las que no quieres ayudar. */
  blocked: string[]
  /**
   * Si sales «de guardia» en las listas: hace falta el interruptor encendido
   * (`available`) y estar sentado en el campus (`seat`). Las reservas no
   * dependen de esto: van por las medias horas marcadas y el tope.
   */
  presence: { available: boolean; seat: string | null }
}

/** `GET /help/inbox`: lo que sale en una ventana que no se salta. */
export type HelpInbox = {
  /** Te han pedido ayuda y aún no has contestado. */
  requests: Booking[]
  /** Te han rechazado o anulado una reserva y aún no lo has visto. */
  news: Booking[]
}

/** Cuerpo de `PUT /help/today`. */
export type HelpDayInput = {
  windows: TimeRange[]
  maxMinutes: number
}

/** Cada elemento de `GET /help/offers`: alguien que se ofrece hoy y aún tiene hueco. */
export type HelpOffer = {
  login: string
  /** Inicios libres, cada media hora (`HH:MM`). */
  freeStarts: string[]
  /** Minutos que le quedan por ofrecer hoy. */
  remainingMinutes: number
}

/** Cuerpo de `POST /help/bookings`. */
export type BookingInput = {
  helper: string
  projectId?: number | null
  start: string
  /** 30, 60, 90 o 120. */
  minutes: number
  note?: string | null
}

/** `GET /help/reputation`: cómo te han descrito quienes te ayudaron. */
export type HelpReputation = {
  asked: Record<RequesterTag, number>
}
