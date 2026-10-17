import { describe, expect, it } from 'vitest'

import type { CalendarEvent } from '@sanatorio/contracts'

import { hourRange, lanesOf, minutesUntilNext } from '../src/features/calendar/timeline'

const day = new Date(2026, 9, 16)
const at = (hours: number, minutes = 0): string =>
  new Date(2026, 9, 16, hours, minutes).toISOString()

const event = (id: string, start: string, end: string): CalendarEvent =>
  ({ id, start, end, kind: 'board', title: id, place: null, joined: true }) as CalendarEvent

describe('las horas del calendario', () => {
  const events = [event('a', at(10, 30), at(12)), event('b', at(16), at(17, 15))]

  it('elige el tramo según la vista', () => {
    expect(hourRange('full', events, [day], day)).toEqual({ from: 0, to: 24 })
    // De la primera a la última, en horas enteras.
    expect(hourRange('fit', events, [day], day)).toEqual({ from: 10, to: 18 })
    // Desde ahora: a las 13:20, de 13 a 18.
    expect(hourRange('now', events, [day], new Date(2026, 9, 16, 13, 20))).toEqual({
      from: 13,
      to: 18,
    })
    // Si no es hoy, como ajustada.
    expect(hourRange('now', events, [day], new Date(2026, 9, 20, 9))).toEqual({ from: 10, to: 18 })
    // Sin nada: un día de clase.
    expect(hourRange('fit', [], [day], day)).toEqual({ from: 8, to: 20 })
  })

  it('a última hora no se apelotona: siempre se ven al menos tres horas', () => {
    // Desde ahora a las 23:20, sin nada más: de 21 a 24, no solo de 23 a 24.
    expect(hourRange('now', events, [day], new Date(2026, 9, 16, 23, 20))).toEqual({
      from: 21,
      to: 24,
    })
    // Ajustada con un solo evento de media hora: tres horas desde su inicio.
    expect(hourRange('fit', [event('c', at(9), at(9, 30))], [day], day)).toEqual({
      from: 9,
      to: 12,
    })
    // Al final del día, se completa hacia atrás.
    expect(hourRange('fit', [event('d', at(23), at(23, 30))], [day], day)).toEqual({
      from: 21,
      to: 24,
    })
  })

  it('pone uno al lado del otro los eventos que se pisan', () => {
    const placed = lanesOf(
      [
        event('a', at(10), at(12)),
        event('b', at(11), at(13)),
        event('c', at(12), at(14)),
        event('d', at(15), at(16)),
      ],
      day,
    )
    const byId = Object.fromEntries(placed.map((one) => [one.event.id, [one.lane, one.lanes]]))

    expect(byId).toEqual({ a: [0, 2], b: [1, 2], c: [0, 2], d: [0, 1] })
  })

  it('cuenta lo que falta para lo siguiente de hoy', () => {
    expect(minutesUntilNext(events, new Date(2026, 9, 16, 15, 30))).toBe(30)
    expect(minutesUntilNext(events, new Date(2026, 9, 16, 18))).toBeNull()
  })
})
