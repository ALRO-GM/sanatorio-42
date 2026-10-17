/**
 * Buzón de avisos: qué se ve con cada filtro y qué se iría al borrar los leídos.
 */

import { describe, expect, it } from 'vitest'

import type { Notice } from '@sanatorio/contracts'

import {
  calendarEventOf,
  noticesIn,
  removableCount,
  targetOf,
} from '../src/features/notices/routes'

const items = [
  { id: 1, read: true, saved: false },
  { id: 2, read: true, saved: true },
  { id: 3, read: false, saved: false },
  { id: 4, read: false, saved: true },
]

describe('buzón de avisos', () => {
  it('«guardados» deja solo los guardados; «todos», todos y en su orden', () => {
    expect(noticesIn(items, 'saved').map((n) => n.id)).toEqual([2, 4])
    expect(noticesIn(items, 'all').map((n) => n.id)).toEqual([1, 2, 3, 4])
    expect(noticesIn([], 'saved')).toEqual([])
  })

  it('borrar los leídos se lleva los leídos sin guardar, y solo esos', () => {
    expect(removableCount(items)).toBe(1)
    expect(removableCount([])).toBe(0)
    expect(removableCount([{ read: false, saved: false }])).toBe(0)
  })

  it('los avisos de pizarras y grupos llevan al calendario con su evento abierto', () => {
    const notice = (kind: Notice['kind'], ref: string) => ({ kind, ref }) as Notice

    expect(targetOf(notice('board_changed', 'board:12'))).toBe('calendario')
    expect(calendarEventOf(notice('board_changed', 'board:12'))).toBe('board:12')
    // En el calendario, un grupo es cada uno de sus días: therapy:5:… (se abre el próximo).
    expect(calendarEventOf(notice('group_invite', 'group:5'))).toBe('therapy:5')
    expect(calendarEventOf(notice('group_joined', 'group:5'))).toBe('therapy:5')
    // Lo que ya no está en el calendario va a su sección, sin evento.
    expect(targetOf(notice('board_cancelled', 'board:12'))).toBe('pizarras')
    expect(calendarEventOf(notice('board_cancelled', 'board:12'))).toBeNull()
    expect(targetOf(notice('group_closed', 'group:5'))).toBe('terapia')
    expect(calendarEventOf(notice('doubt_answered', 'doubt:1'))).toBeNull()
  })
})
