/**
 * Avisos con cuenta atrás (`docs/avisos-cuenta-atras.md`): una ventanita
 * flotante, como la del Pomodoro, que cuenta lo que falta para algo. Los manda
 * quien administra a todo el mundo (la limpieza de taquillas) o se los fija
 * cada cual (un evento del calendario, su próximo compromiso, algo suyo).
 */

import type { EventTitle } from './calendar.js'

/** De dónde sale una cuenta atrás. */
export type CountdownKind =
  /** Un aviso de quien administra. */
  | 'notice'
  /** Un evento del calendario que te has fijado. */
  | 'event'
  /** Tu próximo compromiso del calendario: cambia solo cuando pasa. */
  | 'next'
  /** Uno tuyo, con título y hora a mano. */
  | 'custom'

/** Avisos con texto ya escrito (en cada idioma, en la web). */
export type CountdownPreset = 'lockers'

/** A qué grupo va un aviso de quien administra (mundos separados, `docs/piscineros.md`). */
export type CountdownGroup = 'all' | 'students' | 'pool'

/** Una cuenta atrás tal como la ve quien la tiene en pantalla. */
export type Countdown = {
  /** Id del aviso (`kind: 'notice'`) o de lo fijado (el resto). */
  id: number
  kind: CountdownKind
  /** `null` en un aviso con texto ya escrito (`preset`) o en `next` sin nada a la vista. */
  title: string | null
  body: string | null
  preset: CountdownPreset | null
  /** Hasta cuándo (ISO-8601, UTC). `null` en `next` si no tienes nada a la vista. */
  at: string | null
  /** El evento del calendario (`board:12`, `event:44687`), si sale de uno. */
  eventId: string | null
  /**
   * De qué es el título, si es de un evento con título puesto por Peer4U
   * (`CalendarEvent['label']`): la web lo escribe en su idioma en vez de
   * `title`, que va en español.
   */
  label: EventTitle | null
  /** Quién mandó el aviso; `null` en lo tuyo. */
  from: string | null
}

/** Cuerpo de `POST /countdowns/pins`. */
export type CountdownPinInput =
  | { kind: 'event'; eventId: string }
  | { kind: 'next' }
  | { kind: 'custom'; title: string; at: string }

/** Cuerpo de `POST /admin/countdowns`. Con `preset`, título y texto son opcionales. */
export type CountdownNoticeInput = {
  title?: string | null
  body?: string | null
  preset?: CountdownPreset | null
  at: string
  group: CountdownGroup
  /** Solo a quien mira ese campus; `null` o sin él, a todos. */
  campusId?: number | null
}

/** Un aviso mandado, para el panel: a quién va y cuánta gente lo ha cerrado. */
export type CountdownNoticeReport = Countdown & {
  group: CountdownGroup
  campusId: number | null
  /** Cuánta gente lo ha cerrado. */
  dismissed: number
  createdAt: string
}
