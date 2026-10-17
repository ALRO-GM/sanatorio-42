/**
 * La semana y el día con las horas a la vista: qué tramo del día se pinta y en
 * qué carril va cada evento si se pisan.
 *
 * - `list`: sin horas, un evento debajo de otro (con su inicio y su fin).
 * - `full`: el día entero, de 0 a 24.
 * - `fit`: de la primera hora en que empieza algo a la última en que acaba algo.
 * - `now`: desde la hora actual hasta que acaba lo último del día; si no se está
 *   viendo hoy, como `fit`.
 */

import type { CalendarEvent } from '@sanatorio/contracts'

import { addDays, sameDay } from './dates'

export const LAYOUTS = ['list', 'full', 'fit', 'now'] as const

export type Layout = (typeof LAYOUTS)[number]

/**
 * Como poco, estas horas a la vista: con menos (a última hora, «desde ahora»)
 * todo se apelotona. Se completa hacia atrás si el día se acaba.
 */
const MIN_SPAN = 3

/** Con al menos `MIN_SPAN` horas, sin salirse de 0–24. */
function widened(from: number, to: number): { from: number; to: number } {
  if (to - from >= MIN_SPAN) return { from, to }

  const end = Math.min(24, from + MIN_SPAN)

  return { from: Math.max(0, end - MIN_SPAN), to: Math.max(to, end) }
}

/** El tramo que se enseña sin nada que mirar: un día de clase. */
const EMPTY_RANGE = { from: 8, to: 20 }

const KEY = 'sanatorio_calendar_layout'

/** Horas (con decimales) desde la medianoche de `day`, entre 0 y 24. */
export function hoursIn(day: Date, iso: string): number {
  const hours = (Date.parse(iso) - day.getTime()) / 3_600_000

  return Math.min(24, Math.max(0, hours))
}

/**
 * Las horas que se pintan, en horas enteras: desde `from` hasta `to`. Es el
 * mismo tramo para todos los días que se ven, para que en la semana las
 * columnas cuadren.
 */
export function hourRange(
  layout: Layout,
  events: readonly CalendarEvent[],
  days: readonly Date[],
  now: Date,
): { from: number; to: number } {
  if (layout === 'full' || layout === 'list') return { from: 0, to: 24 }

  let first = Infinity
  let last = -Infinity

  for (const day of days) {
    const end = addDays(day, 1).getTime()

    for (const event of events) {
      if (Date.parse(event.start) >= end || Date.parse(event.end) <= day.getTime()) continue

      first = Math.min(first, hoursIn(day, event.start))
      last = Math.max(last, hoursIn(day, event.end))
    }
  }

  const today = days.find((day) => sameDay(day, now))

  if (layout === 'now' && today !== undefined) {
    const from = Math.floor(hoursIn(today, now.toISOString()))

    return widened(
      from,
      Math.min(24, Math.max(from + 1, Math.ceil(last === -Infinity ? from + 4 : last))),
    )
  }

  if (first === Infinity) return EMPTY_RANGE

  const from = Math.floor(first)

  return widened(from, Math.max(from + 1, Math.ceil(last)))
}

/**
 * Los eventos de un día con su carril: los que se pisan van uno al lado del
 * otro. `lanes` es cuántos carriles tiene el grupo de eventos que se pisan.
 */
export function lanesOf(
  events: readonly CalendarEvent[],
  day: Date,
): { event: CalendarEvent; start: number; end: number; lane: number; lanes: number }[] {
  const placed = events
    .map((event) => ({
      event,
      start: hoursIn(day, event.start),
      // Algo de menos de un cuarto de hora se pinta como un cuarto, para que se vea.
      end: Math.max(hoursIn(day, event.end), hoursIn(day, event.start) + 0.25),
      lane: 0,
      lanes: 1,
    }))
    .sort((a, b) => a.start - b.start || b.end - a.end)
  let group: typeof placed = []
  let groupEnd = -Infinity

  const close = (): void => {
    const lanes = Math.max(1, ...group.map((one) => one.lane + 1))

    for (const one of group) one.lanes = lanes
  }

  for (const one of placed) {
    if (one.start >= groupEnd && group.length > 0) {
      close()
      group = []
    }

    const busy = new Set(group.filter((other) => other.end > one.start).map((other) => other.lane))
    let lane = 0

    while (busy.has(lane)) lane += 1

    one.lane = lane
    group.push(one)
    groupEnd = Math.max(groupEnd, one.end)
  }

  if (group.length > 0) close()

  return placed
}

/** Cuánto falta para lo siguiente de hoy, en minutos, o `null` si no queda nada. */
export function minutesUntilNext(events: readonly CalendarEvent[], now: Date): number | null {
  const next = events
    .map((event) => Date.parse(event.start))
    .filter((start) => start > now.getTime() && sameDay(new Date(start), now))
    .sort((a, b) => a - b)[0]

  return next === undefined ? null : Math.round((next - now.getTime()) / 60_000)
}

export function loadLayout(): Layout {
  try {
    const stored = localStorage.getItem(KEY)

    return LAYOUTS.find((layout) => layout === stored) ?? 'list'
  } catch {
    return 'list'
  }
}

export function saveLayout(layout: Layout): void {
  try {
    localStorage.setItem(KEY, layout)
  } catch {
    // Sin guardar: la próxima vez sale la lista.
  }
}
