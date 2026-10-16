/**
 * El editor de la guardia: qué medias horas se pueden pulsar y cuáles están reservadas.
 */

import { describe, expect, it } from 'vitest'

import type { Booking } from '@sanatorio/contracts'

import { bookedSlotsOf, canToggle } from '../src/features/help/time'

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
