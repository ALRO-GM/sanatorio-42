import type { HelpDay, TimeRange } from '@sanatorio/contracts'

import { clockOf } from '../../shared/day'

/** Todo va en medias horas. */
export const SLOT = 30

/** Primera y última hora que enseña el editor de franjas. */
export const DAY_START = 8 * 60
export const DAY_END = 24 * 60

export function toMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':')

  return Number(hours) * 60 + Number(minutes)
}

export const toTime = clockOf

/** "1 h 30 min", "45 min", "2 h". */
export function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return [hours > 0 ? `${hours} h` : '', rest > 0 ? `${rest} min` : ''].filter(Boolean).join(' ')
}

/** Inicios de media hora que cubren esas franjas. */
export function slotsOf(windows: readonly TimeRange[]): Set<number> {
  const slots = new Set<number>()

  for (const window of windows) {
    for (let start = toMinutes(window.start); start < toMinutes(window.end); start += SLOT) {
      slots.add(start)
    }
  }

  return slots
}

/** Las franjas que forman esas medias horas: las contiguas se juntan. */
export function windowsOf(slots: ReadonlySet<number>): TimeRange[] {
  const windows: { start: number; end: number }[] = []

  for (const start of [...slots].sort((a, b) => a - b)) {
    const last = windows.at(-1)

    if (last?.end === start) {
      last.end = start + SLOT
    } else {
      windows.push({ start, end: start + SLOT })
    }
  }

  return windows.map((window) => ({ start: toTime(window.start), end: toTime(window.end) }))
}

/** Medias horas de hoy que alguien te ha reservado (pedidas o aceptadas). */
export function bookedSlotsOf(day: Pick<HelpDay, 'day' | 'bookings'>): Set<number> {
  return slotsOf(
    day.bookings.filter(
      (booking) =>
        booking.role === 'helper' &&
        booking.day === day.day &&
        (booking.status === 'pending' || booking.status === 'confirmed'),
    ),
  )
}

/**
 * Si una media hora del editor se puede pulsar. Quitarla siempre se puede,
 * salvo si está reservada (se suelta cancelando la reserva). Marcarla, solo si
 * no ha empezado y no tienes otra cosa en el calendario a esa hora. Es lo que
 * acepta la API.
 */
export function canToggle(slot: {
  past: boolean
  active: boolean
  booked: boolean
  taken?: boolean
}): boolean {
  if (slot.booked) return false
  if (slot.active) return true

  return !slot.past && slot.taken !== true
}
