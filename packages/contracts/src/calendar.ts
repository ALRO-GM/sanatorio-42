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

export type CalendarEvent = {
  /** Único dentro del calendario (`board:12`, `event:44687`). */
  id: string
  kind: CalendarKind
  title: string
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
