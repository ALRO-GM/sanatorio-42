/**
 * Las cuentas de la pila de ventanitas de la esquina (`shared/dock/layout.ts`):
 * que no se tapen, que en el móvil formen filas y dónde cae una al arrastrarla.
 */

import { describe, expect, it } from 'vitest'

import {
  clampTo,
  dropIndex,
  GAP,
  MARGIN,
  moveTo,
  NARROW_GAP,
  NARROW_MARGIN,
  stack,
} from '../src/shared/dock/layout'
import type { Box } from '../src/shared/dock/layout'

const DESK = { width: 1280, height: 800 }
const PHONE = { width: 390, height: 800 }

const overlap = (a: Box & { x: number; y: number }, b: Box & { x: number; y: number }): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

/** Comprueba que ningún par de cajas se pisa. */
function apart(boxes: Box[], viewport: { width: number; height: number }): void {
  const { slots } = stack(boxes, viewport)
  const placed = boxes.map((box) => ({ ...box, x: 0, y: 0, ...slots[box.id] }))

  expect(Object.keys(slots)).toHaveLength(boxes.length)

  for (const a of placed) {
    for (const b of placed) if (a !== b) expect(overlap(a, b)).toBe(false)
  }
}

describe('pila de la esquina', () => {
  it('en ancho, una encima de otra desde la esquina, sin pisarse', () => {
    const boxes = [
      { id: 'countdowns', width: 296, height: 260 },
      { id: 'focus', width: 380, height: 80 },
      { id: 'clicker', width: 190, height: 46 },
    ]
    const { slots, height } = stack(boxes, DESK)

    expect(slots.countdowns).toEqual({ x: MARGIN, y: MARGIN })
    expect(slots.focus).toEqual({ x: MARGIN, y: MARGIN + 260 + GAP })
    expect(slots.clicker).toEqual({ x: MARGIN, y: MARGIN + 260 + GAP + 80 + GAP })
    expect(height).toBe(MARGIN + 260 + 80 + 46 + 2 * GAP + MARGIN)
    apart(boxes, DESK)
  })

  it('en el móvil, las plegadas comparten fila y una ancha va en la suya', () => {
    const pills = [
      { id: 'countdowns', width: 150, height: 44 },
      { id: 'focus', width: 150, height: 56 },
      { id: 'clicker', width: 120, height: 44 },
    ]
    const { slots } = stack(pills, PHONE)

    // Las dos primeras caben juntas abajo; la tercera ya no, y sube.
    expect(slots.countdowns?.y).toBe(NARROW_MARGIN)
    expect(slots.focus?.y).toBe(NARROW_MARGIN)
    expect(slots.focus?.x).toBe(NARROW_MARGIN + 150 + NARROW_GAP)
    expect(slots.clicker).toEqual({ x: NARROW_MARGIN, y: NARROW_MARGIN + 56 + NARROW_GAP })
    apart(pills, PHONE)
    apart([{ id: 'wide', width: 374, height: 300 }, ...pills], PHONE)
  })

  it('vacía no ocupa nada; una enorme no rompe las cuentas', () => {
    expect(stack([], DESK)).toEqual({ slots: {}, height: 0, width: 0 })

    const huge = stack([{ id: 'huge', width: 5000, height: 5000 }], PHONE)

    expect(huge.slots.huge).toEqual({ x: NARROW_MARGIN, y: NARROW_MARGIN })
  })

  it('al arrastrar, cae en el hueco más cercano; lejos de todos, flota', () => {
    const others = [
      { id: 'countdowns', width: 296, height: 260 },
      { id: 'clicker', width: 190, height: 46 },
    ]
    const moving = { id: 'focus', width: 380, height: 80 }
    const bottomTop = DESK.height - MARGIN - moving.height

    expect(dropIndex(others, moving, { left: MARGIN, top: bottomTop }, DESK)).toBe(0)
    // Encima de la cuenta atrás: entre ella y Code Clicker.
    expect(dropIndex(others, moving, { left: MARGIN, top: bottomTop - 270 }, DESK)).toBe(1)
    expect(dropIndex(others, moving, { left: 900, top: 40 }, DESK)).toBeNull()
    expect(dropIndex([], moving, { left: MARGIN + 10, top: bottomTop }, DESK)).toBe(0)
  })

  it('una posición fuera de la pantalla vuelve dentro', () => {
    expect(clampTo({ left: -50, top: 9999 }, { width: 100, height: 50 }, DESK)).toEqual({
      left: NARROW_MARGIN,
      top: DESK.height - 50 - NARROW_MARGIN,
    })
    expect(clampTo({ left: Number.NaN, top: 10 }, { width: 100, height: 50 }, DESK).top).toBe(10)
  })

  it('cambiar el orden respeta el sitio de las que ahora no se ven', () => {
    const order = ['countdowns', 'hidden', 'focus', 'clicker']
    const shown = ['countdowns', 'focus', 'clicker']

    expect(moveTo(order, shown, 'clicker', 0)).toEqual(['clicker', 'countdowns', 'hidden', 'focus'])
    expect(moveTo(order, shown, 'countdowns', 99)).toEqual([
      'focus',
      'clicker',
      'countdowns',
      'hidden',
    ])
    expect(moveTo(['a'], ['a'], 'a', -3)).toEqual(['a'])
  })
})
