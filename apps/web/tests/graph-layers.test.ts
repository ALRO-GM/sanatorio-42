/**
 * Red: lo que deja al grafo pintar menos sin que se note.
 */

import { describe, expect, it } from 'vitest'

import {
  inside,
  layerKey,
  segmentMeets,
  strongest,
  visibleBounds,
} from '../src/features/network/graph-layers'
import type { LayerState } from '../src/features/network/graph-layers'

describe('uniones mientras se mueve', () => {
  const links = [3, 9, 1, 7, 5].map((weight) => ({ weight }))

  it('se queda con las más fuertes', () => {
    expect(strongest(links, 2).map((link) => link.weight)).toEqual([9, 7])
  })

  it('si caben todas, todas y en su orden; con cero o menos, ninguna', () => {
    expect(strongest(links, 5)).toEqual(links)
    expect(strongest(links, 9)).toEqual(links)
    expect(strongest(links, 0)).toEqual([])
    expect(strongest(links, -1)).toEqual([])
    expect(strongest([], 3)).toEqual([])
  })

  it('no toca la lista que recibe', () => {
    strongest(links, 2)
    expect(links.map((link) => link.weight)).toEqual([3, 9, 1, 7, 5])
  })
})

describe('capa guardada', () => {
  const base: LayerState = {
    kind: 'rest',
    view: { x: 10, y: 20, k: 1.5 },
    width: 800,
    height: 600,
    ratio: 2,
    version: 7,
  }

  it('la misma clave mientras no cambia nada', () => {
    expect(layerKey(base)).toBe(layerKey({ ...base, view: { ...base.view } }))
  })

  it('cualquier cambio de lo que se ve la invalida', () => {
    const changes: Partial<LayerState>[] = [
      { kind: 'dim' },
      { view: { ...base.view, x: 11 } },
      { view: { ...base.view, k: 1.51 } },
      { width: 801 },
      { height: 599 },
      { ratio: 1 },
      { version: 8 },
    ]

    for (const change of changes) {
      expect(layerKey({ ...base, ...change })).not.toBe(layerKey(base))
    }
  })
})

describe('lo que se ve', () => {
  // Desplazada 100 a la derecha y 20 abajo, con zoom 2: se ve de x -50 a 350 y de y -10 a 290.
  const bounds = visibleBounds({ x: 100, y: 20, k: 2 }, 800, 600)

  it('el rectángulo del grafo que cae en pantalla', () => {
    expect(bounds).toEqual({ left: -50, top: -10, right: 350, bottom: 290 })
  })

  it('un punto dentro, en el borde, fuera y fuera pero dentro del margen', () => {
    expect(inside(bounds, 0, 0)).toBe(true)
    expect(inside(bounds, 350, 290)).toBe(true)
    expect(inside(bounds, 351, 0)).toBe(false)
    expect(inside(bounds, 360, 0, 20)).toBe(true)
  })

  it('una unión con las dos puntas del mismo lado de fuera no se pinta; si cruza, sí', () => {
    expect(segmentMeets(bounds, -100, 10, -60, 50)).toBe(false)
    expect(segmentMeets(bounds, 400, 10, 500, 50)).toBe(false)
    expect(segmentMeets(bounds, 10, -15, 50, -11)).toBe(false)
    expect(segmentMeets(bounds, 10, 400, 50, 291)).toBe(false)
    // Las dos fuera, pero a lados opuestos: cruza.
    expect(segmentMeets(bounds, -100, 100, 400, 100)).toBe(true)
    expect(segmentMeets(bounds, 0, 0, 10, 10)).toBe(true)
  })
})
