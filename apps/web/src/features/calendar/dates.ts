import type { CalendarEvent } from '@sanatorio/contracts'

import type { View } from './kinds'
import { localeOf } from '../../shared/i18n/locale'

/** Medianoche (hora del navegador) de ese día. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/** El lunes de la semana de ese día. */
function startOfWeek(date: Date): Date {
  return addDays(date, -((date.getDay() + 6) % 7))
}

export const sameDay = (a: Date, b: Date): boolean =>
  startOfDay(a).getTime() === startOfDay(b).getTime()

/**
 * Los días que enseña una vista alrededor de una fecha.
 *
 * El mes se completa con los días de las semanas que asoman por delante y por
 * detrás, para que la cuadrícula sea siempre de semanas enteras.
 */
export function daysOf(view: View, cursor: Date): Date[] {
  if (view === 'day') {
    return [startOfDay(cursor)]
  }

  if (view === 'week') {
    const monday = startOfWeek(cursor)

    return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
  }

  const first = startOfWeek(new Date(cursor.getFullYear(), cursor.getMonth(), 1))
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
  const days: Date[] = []

  for (let day = first; day <= last || days.length % 7 !== 0; day = addDays(day, 1)) {
    days.push(day)
  }

  return days
}

/** La fecha a la que se va con "anterior" o "siguiente". */
export function move(view: View, cursor: Date, direction: 1 | -1): Date {
  if (view === 'month') {
    return new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1)
  }

  return addDays(cursor, direction * (view === 'week' ? 7 : 1))
}

/** Eventos que tocan ese día, por hora de inicio. Uno de varios días sale en cada uno. */
export function eventsOn(events: readonly CalendarEvent[], day: Date): CalendarEvent[] {
  const from = day.getTime()
  const to = addDays(day, 1).getTime()

  return events.filter((event) => Date.parse(event.start) < to && Date.parse(event.end) > from)
}

export const locale = localeOf

/** `16:00`, en la hora del navegador. */
function time(iso: string, lang: string): string {
  return new Date(iso).toLocaleTimeString(locale(lang), { hour: '2-digit', minute: '2-digit' })
}

/** La hora que enseña un evento en un día concreto: la de inicio, o nada si viene de antes. */
export function timeOn(event: CalendarEvent, day: Date, lang: string): string {
  return Date.parse(event.start) < day.getTime() ? '' : time(event.start, lang)
}

/**
 * Inicio y fin de un evento en un día concreto (`16:00–18:00`). Lo que viene de
 * otro día o sigue al siguiente se queda sin esa hora.
 */
export function rangeOn(event: CalendarEvent, day: Date, lang: string): string {
  const start = timeOn(event, day, lang)
  const end = Date.parse(event.end) > addDays(day, 1).getTime() ? '' : time(event.end, lang)

  return start === '' && end === '' ? '' : `${start}–${end}`
}

/** "martes, 13 de octubre · 16:00–18:00", o las dos fechas si dura varios días. */
export function whenText(event: CalendarEvent, lang: string): string {
  const start = new Date(event.start)
  const end = new Date(event.end)
  const date = (value: Date): string =>
    value.toLocaleDateString(locale(lang), { weekday: 'long', day: 'numeric', month: 'long' })

  return sameDay(start, end)
    ? `${date(start)} · ${time(event.start, lang)}–${time(event.end, lang)}`
    : `${date(start)}, ${time(event.start, lang)} – ${date(end)}, ${time(event.end, lang)}`
}

/** El título de la barra: el día, la semana o el mes que se está viendo. */
export function rangeTitle(view: View, cursor: Date, lang: string): string {
  const days = daysOf(view, cursor)
  const first = days[0] ?? cursor
  const last = days.at(-1) ?? cursor

  if (view === 'month') {
    return cursor.toLocaleDateString(locale(lang), { month: 'long', year: 'numeric' })
  }

  if (view === 'day') {
    return first.toLocaleDateString(locale(lang), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  const short = (date: Date): string =>
    date.toLocaleDateString(locale(lang), { day: 'numeric', month: 'short' })

  return `${short(first)} – ${short(last)}`
}
