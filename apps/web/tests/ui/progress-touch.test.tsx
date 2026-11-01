/**
 * El Avance con el dedo (pedido por Alberto el 2026-11-01): tocar marca un
 * punto que se queda; arrastrando lejos de donde se tocó se recorre la línea
 * más fino, y al soltar sigue marcado hasta que se toca fuera.
 */
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { must } from './must'
import { openApp } from './render'

const chartCard = (): HTMLElement =>
  must(document.querySelector<HTMLElement>('.progress-card'), 'la gráfica')
const svg = (): SVGSVGElement =>
  must(chartCard().querySelector<SVGSVGElement>('.progress-chart svg'), 'el dibujo')
const ready = () =>
  screen.findAllByText(/^Python · En curso \+ terminado · Madrid/, {}, { timeout: 5000 })
const day = (): number => Number(/Día (\d+)/.exec(screen.getByRole('status').textContent)?.[1])
const finger = { pointerId: 7, pointerType: 'touch' }

beforeAll(() => {
  // jsdom no trae `PointerEvent`: sin él, los eventos llegan sin tipo ni coordenadas.
  if (!('PointerEvent' in window)) {
    class PointerEventLike extends MouseEvent {
      pointerId: number
      pointerType: string

      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init)
        this.pointerId = init.pointerId ?? 0
        this.pointerType = init.pointerType ?? 'mouse'
      }
    }

    vi.stubGlobal('PointerEvent', PointerEventLike)
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Avance con el dedo', () => {
  it('el punto se queda, se afina arrastrando lejos y un toque fuera lo quita', async () => {
    await openApp('#/avance')
    await ready()
    vi.spyOn(svg(), 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 640,
      height: 280,
      right: 640,
      bottom: 280,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    fireEvent.pointerDown(svg(), { ...finger, clientX: 320, clientY: 140 })
    const start = day()

    expect(start).toBeGreaterThan(0)
    expect(chartCard().querySelector('.progress-chart.marked')).not.toBeNull()

    // Muy por debajo de la gráfica: 80 px a la derecha mueven mucho menos que 80 px.
    fireEvent.pointerMove(svg(), { ...finger, clientX: 320, clientY: 600 })
    fireEvent.pointerMove(svg(), { ...finger, clientX: 400, clientY: 600 })
    const fine = day()

    expect(screen.getByText(/Ajuste fino ×\d+/)).toBeTruthy()
    expect(fine).toBeGreaterThanOrEqual(start)

    // Al soltar, sigue marcado (también al salir de la gráfica).
    fireEvent.pointerUp(svg(), finger)
    fireEvent.pointerLeave(svg(), finger)
    expect(day()).toBe(fine)
    expect(screen.queryByText(/Ajuste fino/)).toBeNull()

    // De nuevo, sin afinar: el mismo gesto mueve más.
    fireEvent.pointerDown(svg(), { ...finger, clientX: 320, clientY: 140 })
    fireEvent.pointerMove(svg(), { ...finger, clientX: 400, clientY: 140 })
    expect(day()).toBeGreaterThan(fine)
    fireEvent.pointerUp(svg(), finger)

    // Un toque fuera lo quita.
    fireEvent.pointerDown(document.body, finger)
    expect(chartCard().querySelector('.progress-tip')).toBeNull()
  }, 20_000)
})
