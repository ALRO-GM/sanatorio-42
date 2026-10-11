/**
 * Administración de la web y el buzón de la gente (incidencias, sugerencias y
 * denuncias).
 */

/** `issue`: algo no va · `idea`: una mejora · `report`: denuncia de un contenido. */
export type TicketKind = 'issue' | 'idea' | 'report'

export type TicketStatus = 'open' | 'answered' | 'closed'

export type Ticket = {
  id: number
  login: string
  kind: TicketKind
  subject: string
  body: string
  /** De qué va una denuncia: `message:12`, `board:3`, `doubt:5`. `null` en el resto. */
  target: string | null
  status: TicketStatus
  /** Lo que respondió quien administra, o `null` si aún no. */
  answer: string | null
  answeredBy: string | null
  createdAt: string
  answeredAt: string | null
}

/** `POST /tickets`. */
export type TicketInput = {
  kind: TicketKind
  subject: string
  body: string
  target?: string
}

/** Peticiones de una hora concreta. */
export type UsageHour = {
  /** Día (`YYYY-MM-DD`) y hora (0-23), en UTC. */
  day: string
  hour: number
  requests: number
  bytes: number
  /** Personas distintas que usaron la web esa hora. */
  people: number
}

/** `GET /admin/consumption`: cuánto se usa la web y cómo de cerca está de sus límites. */
export type Consumption = {
  limit: {
    /** Peticiones por hora que se reparten entre quienes están usando la web. */
    budget: number
    /** Personas activas en la última hora. */
    activePeople: number
    /** Tope automático por persona y hora ahora mismo. */
    perPerson: number
    /** Peticiones a la API de 42 que quedan esta hora, o `null` si no se sabe. */
    fortyTwoRemaining: number | null
  }
  /** Las últimas 48 horas, de la más antigua a la más reciente. */
  recent: UsageHour[]
  /**
   * Media de peticiones por hora para cada día de la semana y hora (UTC), con
   * los últimos 28 días. `weekday`: 0 es domingo.
   */
  pattern: { weekday: number; hour: number; requests: number }[]
  /** Tramos en los que la media supera el 80 % del presupuesto. */
  warnings: { weekday: number; hour: number; requests: number; share: number }[]
  /** Quién más ha consumido en las últimas 24 horas. */
  top: {
    login: string
    requests: number
    bytes: number
    /** Peticiones que se le rechazaron por pasarse del tope. */
    limited: number
    /** Tope puesto a mano, o `null` si lleva el automático. */
    manualLimit: number | null
  }[]
}

/** `GET /admin/people`: permisos, bloqueos y topes a mano. */
export type AdminPeople = {
  admins: { login: string; fixed: boolean; grantedBy: string | null }[]
  blocks: { login: string; reason: string; until: string | null; blockedBy: string }[]
  limits: { login: string; perHour: number }[]
}

/** Un mensaje del chat de un evento, para revisarlo. */
export type LoggedMessage = {
  id: number
  eventId: string
  login: string
  kind: string
  body: string | null
  at: string
}
