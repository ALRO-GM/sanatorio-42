/**
 * Buzón de avisos: qué se ve con cada filtro y qué se iría al borrar los leídos.
 */

import { describe, expect, it } from 'vitest'

import { noticesIn, removableCount } from '../src/features/notices/routes'

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
})
