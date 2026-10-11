/**
 * Orden de pestañas y bloques: manual o automático por uso.
 */

import { describe, expect, it } from 'vitest'

import { arrange, move } from '../src/shared/layout/order'

const DEFAULTS = ['a', 'b', 'c', 'd']
const key = (id: string): string => `nav.${id}`

describe('orden de elementos', () => {
  it('manual: respeta lo guardado, añade lo nuevo al final e ignora lo que ya no existe', () => {
    expect(arrange(DEFAULTS, [], 'manual', {}, key)).toEqual(DEFAULTS)
    expect(arrange(DEFAULTS, ['c', 'a'], 'manual', {}, key)).toEqual(['c', 'a', 'b', 'd'])
    expect(arrange(DEFAULTS, ['zz', 'd', 'c', 'b', 'a'], 'manual', {}, key)).toEqual([
      'd',
      'c',
      'b',
      'a',
    ])
    // En manual los usos no pintan nada.
    expect(arrange(DEFAULTS, [], 'manual', { 'nav.d': 99 }, key)).toEqual(DEFAULTS)
  })

  it('automático: lo más usado primero, y a igualdad el orden de fábrica', () => {
    const counts = { 'nav.c': 10, 'nav.a': 3, 'nav.d': 10 }

    expect(arrange(DEFAULTS, ['b', 'a'], 'mine', counts, key)).toEqual(['c', 'd', 'a', 'b'])
    expect(arrange(DEFAULTS, [], 'community', counts, key)).toEqual(['c', 'd', 'a', 'b'])
    // Sin ningún uso no se mueve nada.
    expect(arrange(DEFAULTS, [], 'mine', {}, key)).toEqual(DEFAULTS)
  })

  it('mueve un elemento una posición sin salirse de la lista', () => {
    expect(move(DEFAULTS, 'c', -1)).toEqual(['a', 'c', 'b', 'd'])
    expect(move(DEFAULTS, 'c', 1)).toEqual(['a', 'b', 'd', 'c'])
    expect(move(DEFAULTS, 'a', -1)).toEqual(DEFAULTS)
    expect(move(DEFAULTS, 'd', 1)).toEqual(DEFAULTS)
    expect(move(DEFAULTS, 'zz', 1)).toEqual(DEFAULTS)
  })
})
