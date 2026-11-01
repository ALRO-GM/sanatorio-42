/**
 * El editor de la guardia: qué medias horas se pueden pulsar y cuáles están reservadas.
 */

import { describe, expect, it } from 'vitest'

import type { Booking } from '@sanatorio/contracts'

import {
  bookedSlotsOf,
  canToggle,
  DAY_END,
  SHORT_SPAN,
  shortStarts,
} from '../src/features/help/time'

const booking = (overrides: Partial<Booking>): Booking => ({
  id: 1,
  helper: 'eva',
  requester: 'ana',
  peer: { login: 'ana', image: null },
  role: 'helper',
  projectId: null,
  projectName: null,
  day: '2026-10-16',
  start: '17:00',
  end: '18:00',
  note: null,
  status: 'confirmed',
  finished: false,
  verified: false,
  ratedByMe: false,
  ratedByPeer: false,
  xp: null,
  ...overrides,
})

describe('guardia: medias horas', () => {
  it('una futura se marca y se quita; una empezada solo se quita', () => {
    expect(canToggle({ past: false, active: false, booked: false })).toBe(true)
    expect(canToggle({ past: false, active: true, booked: false })).toBe(true)
    expect(canToggle({ past: true, active: true, booked: false })).toBe(true)
    expect(canToggle({ past: true, active: false, booked: false })).toBe(false)
  })

  it('con otra cosa en el calendario no se marca, pero lo ya marcado se puede quitar', () => {
    expect(canToggle({ past: false, active: false, booked: false, taken: true })).toBe(false)
    expect(canToggle({ past: false, active: true, booked: false, taken: true })).toBe(true)
    expect(canToggle({ past: false, active: false, booked: false, taken: false })).toBe(true)
  })

  it('la reservada no se toca, empezada o no', () => {
    expect(canToggle({ past: false, active: true, booked: true })).toBe(false)
    expect(canToggle({ past: true, active: true, booked: true })).toBe(false)
  })

  it('reservadas son las de hoy en las que ayudas, pedidas o aceptadas', () => {
    const day = '2026-10-16'

    expect([...bookedSlotsOf({ day, bookings: [booking({})] })]).toEqual([17 * 60, 17 * 60 + 30])
    expect(
      bookedSlotsOf({
        day,
        bookings: [
          booking({ status: 'pending', start: '19:00', end: '19:30' }),
          booking({ status: 'declined' }),
          booking({ status: 'cancelled' }),
          // La que pediste tú no ocupa tu guardia; la de ayer sin valorar, tampoco.
          booking({ role: 'requester', start: '20:00', end: '20:30' }),
          booking({ day: '2026-10-15', start: '21:00', end: '21:30' }),
        ],
      }),
    ).toEqual(new Set([19 * 60]))
    expect(bookedSlotsOf({ day, bookings: [] }).size).toBe(0)
  })
})

describe('guardia: el editor recogido', () => {
  const h = (hours: number, minutes = 0): number => hours * 60 + minutes
  const range = (from: number, to: number): number[] =>
    Array.from({ length: (to - from) / 30 }, (_, index) => from + index * 30)

  it('sin nada marcado, de ahora a cuatro horas más', () => {
    expect(shortStarts(h(11), [])).toEqual(range(h(11), h(11) + SHORT_SPAN))
  })

  it('lo que tengas más tarde sale con su hora entera; lo vacío de en medio, no', () => {
    expect(shortStarts(h(11), [h(18, 30)])).toEqual([...range(h(11), h(15)), h(18), h(18, 30)])
    // Lo de antes de ahora o dentro de las cuatro horas no añade nada.
    expect(shortStarts(h(11), [h(9), h(12, 30)])).toEqual(range(h(11), h(15)))
  })

  it('nunca pasa de medianoche', () => {
    expect(shortStarts(h(22), [])).toEqual(range(h(22), DAY_END))
    expect(shortStarts(h(11), [h(23, 30)]).at(-1)).toBe(h(23, 30))
  })

  it('con muchas medias horas repetidas, cada una sale una vez y en orden', () => {
    const many = Array.from({ length: 10_000 }, (_, index) => h(8) + (index % 32) * 30)

    expect(shortStarts(h(8), many)).toEqual(range(h(8), DAY_END))
  })
})
