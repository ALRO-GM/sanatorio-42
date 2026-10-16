/**
 * La guardia: qué se dice de si sales de guardia y de si te pueden reservar.
 */

import { describe, expect, it } from 'vitest'

import { guardStatus, minutesLeft } from '../src/features/help/status'
import { duration } from '../src/features/help/time'

const day = (overrides: Partial<Parameters<typeof guardStatus>[0]> = {}) => ({
  windows: [{ start: '17:00', end: '19:00' }],
  busy: [],
  now: '16:00',
  maxMinutes: 60,
  bookedMinutes: 0,
  presence: { available: true, seat: 'c1r2s3' },
  ...overrides,
})

describe('estado de la guardia', () => {
  it('de guardia hace falta el interruptor y estar sentado', () => {
    expect(guardStatus(day(), duration)[0]).toMatchObject({ key: 'help.status.onDuty', tone: 'ok' })
    expect(guardStatus(day({ presence: { available: true, seat: null } }), duration)[0].key).toBe(
      'help.status.notSeated',
    )
    expect(
      guardStatus(day({ presence: { available: false, seat: 'c1r2s3' } }), duration)[0].key,
    ).toBe('help.status.offDuty')
  })

  it('las reservas no dependen del interruptor: van por lo marcado y el tope', () => {
    const off = day({ presence: { available: false, seat: null } })

    expect(guardStatus(off, duration)[1]).toEqual({
      key: 'help.status.bookable',
      vars: { left: '1 h', max: '1 h' },
      tone: 'ok',
    })
  })

  it('el ejemplo del tope: 2 h marcadas con tope de 1 h; reservada 1 h, ya no sales', () => {
    expect(guardStatus(day({ bookedMinutes: 30 }), duration)[1].vars).toEqual({
      left: '30 min',
      max: '1 h',
    })
    expect(guardStatus(day({ bookedMinutes: 60 }), duration)[1]).toEqual({
      key: 'help.status.capReached',
      vars: { booked: '1 h' },
      tone: 'warn',
    })
  })

  it('sin medias horas por delante, nadie te puede reservar', () => {
    expect(guardStatus(day({ windows: [] }), duration)[1].key).toBe('help.status.noSlots')
    expect(guardStatus(day({ now: '19:00' }), duration)[1].key).toBe('help.status.noSlots')
  })

  it('lo que queda: lo marcado que no ha terminado y no pisa otra cosa', () => {
    expect(minutesLeft(day())).toBe(120)
    // A las 17:40 la de las 17:30 aún cuenta (está en curso); la de las 17:00, no.
    expect(minutesLeft(day({ now: '17:40' }))).toBe(90)
    expect(minutesLeft(day({ busy: [{ start: '18:00', end: '19:00' }] }))).toBe(60)
    // Más marcado que tope: lo que se dice es el tope.
    expect(guardStatus(day({ maxMinutes: 180 }), duration)[1].vars.left).toBe('2 h')
  })
})
