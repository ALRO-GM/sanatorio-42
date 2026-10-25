/**
 * Tipos de evento del calendario. Cada uno se puede ocultar por separado.
 *
 * Los cuatro últimos vienen de 42; los tres primeros son de Sanatorio.
 */
export type CalendarKind =
  /** Tus franjas de guardia y las reservas de ayuda. */
  | 'help'
  /** Sesiones de los grupos de terapia en los que estás. */
  | 'therapy'
  /** Pizarras del campus. */
  | 'board'
  /** Correcciones ya concertadas en 42, como quien corrige o como quien es corregido. */
  | 'evaluation'
  /** Eventos de 42 a los que estás apuntado. */
  | 'event_joined'
  /** Eventos de 42 del campus a los que no te has apuntado. */
  | 'event_open'
  /** Exámenes de 42. */
  | 'exam'

/** Sección de la web desde la que se gestiona un evento propio. */
export type CalendarSection = 'guardia' | 'terapia' | 'pizarras'

/**
 * De qué es un título que pone Peer4U, para escribirlo en el idioma de quien
 * mira (`event.name.*` en las tablas de la web):
 *
 * - `help_window`: te ofreces a ayudar (una franja de tu guardia).
 * - `helping` / `helped`: ayudas a `login` / `login` te ayuda.
 * - `sprint`: la sesión de un sprint de `project` (o de grupo, sin proyecto).
 * - `correcting` / `corrected`: corriges / te corrigen `project` en 42.
 */
export type EventTitleKind =
  'help_window' | 'helping' | 'helped' | 'sprint' | 'correcting' | 'corrected'

export type EventTitle = {
  kind: EventTitleKind
  /** El proyecto del que va, si se sabe. */
  project: string | null
  /** Con quién, en una reserva de ayuda. */
  login: string | null
}

export type CalendarEvent = {
  /** Único dentro del calendario (`board:12`, `event:44687`). */
  id: string
  kind: CalendarKind
  /**
   * El título, ya escrito. Si es de los que pone Peer4U, en español: la web
   * enseña `label` en su lugar. Se mantiene para lo que no lea `label`.
   */
  title: string
  /**
   * De qué es el título, si lo pone Peer4U; `null` si es propio (una pizarra,
   * un evento o examen de 42), que no se traduce. Puede faltar en un evento
   * guardado antes de que existiera.
   */
  label: EventTitle | null
  /** ISO-8601 en UTC. */
  start: string
  end: string
  place: string | null
  description: string | null
  /**
   * `true` si te has apuntado, `false` si no, `null` si no aplica (lo tuyo
   * propio, como una franja de guardia, o una corrección).
   */
  joined: boolean | null
  /** Plazas ocupadas y totales. `max` es `null` si no hay tope. */
  seats: { taken: number; max: number | null } | null
  /** Con quién es: quien imparte la pizarra, quien te ayuda… */
  withLogin: string | null
  /** Enlace a la página del evento en la intra de 42. Solo en lo que viene de 42. */
  url: string | null
  /** Sección de la web donde se gestiona. Solo en lo propio de Sanatorio. */
  section: CalendarSection | null
}

/** `GET /calendar?from=&to=`: tus eventos entre dos instantes. */
export type Calendar = {
  events: CalendarEvent[]
  /** Cuándo se leyeron por última vez los datos de 42, o `null` si no se ha podido. */
  fortyTwoAt: string | null
}
