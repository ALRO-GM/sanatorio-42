/**
 * La pila de ventanitas de la esquina (`shared/dock`), como la usaría una
 * persona: la cuenta atrás y el Pomodoro a la vez sin taparse, cambiar el
 * orden con el teclado y arrastrando, sacar una a flotar y devolverla, y
 * plegarla.
 */

import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { markCountdownsPage } from '../../src/shared/countdowns'
import { floatingAt, foldedOf, resetDock } from '../../src/shared/dock/store'
import { startFocus, stopFocus } from '../../src/shared/focus'
import { must } from './must'
import { openApp } from './render'

const WAIT = { timeout: 5000 }
const text = (key: string): string => must(es[key], `el texto ${key}`)
const fill = (key: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (done, [name, value]) => done.replace(`{${name}}`, String(value)),
    text(key),
  )

const COUNTDOWN = text('countdown.title')
const FOCUS = text('focus.dockName')

beforeAll(() => {
  // jsdom no trae `PointerEvent`: sin él, los eventos llegan sin botón ni coordenadas.
  if (!('PointerEvent' in window)) {
    class PointerEventLike extends MouseEvent {
      pointerId: number

      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init)
        this.pointerId = init.pointerId ?? 0
      }
    }

    vi.stubGlobal('PointerEvent', PointerEventLike)
  }
})

afterEach(async () => {
  // Por la web (no solo la API de mentira): así el siguiente test no empieza con el Pomodoro puesto.
  await act(() => stopFocus())
  cleanup()
})

/** El hueco de una ventanita en la pila. */
const slot = (id: string): HTMLElement =>
  must(document.querySelector<HTMLElement>(`[data-dock="${id}"]`), `el hueco de ${id}`)

/** Cuánto sube desde abajo (en la pila). */
const bottom = (id: string): number => Number.parseFloat(slot(id).style.bottom)

/** Lo que el navegador recuerda de la pila. */
const saved = (): { order: string[]; floating: Record<string, unknown>; folded: object } =>
  JSON.parse(localStorage.getItem('sanatorio_dock') ?? '{}') as never

const said = (): string => document.querySelector('[data-dock-said]')?.textContent ?? ''

/** La web con la limpieza de taquillas a la vista y un Pomodoro en marcha. */
async function both(): Promise<void> {
  await openApp('#/expediente')
  await screen.findByRole('complementary', { name: COUNTDOWN }, WAIT)
  await act(() =>
    startFocus({ focusMinutes: 25, breakMinutes: 5, sections: ['expediente'], show: [] }),
  )
  await screen.findByRole('timer', { name: text('focus.timerLabel') }, WAIT)
}

describe('ventanitas de la esquina', () => {
  it('la cuenta atrás y el Pomodoro van una encima de otra, sin taparse', async () => {
    await both()

    expect(slot('countdowns').dataset.dockState).toBe('docked')
    expect(slot('focus').dataset.dockState).toBe('docked')
    expect(slot('countdowns').style.left).toBe(slot('focus').style.left)
    // La cuenta atrás llegó antes: en la esquina. El Pomodoro, encima, pasada su altura.
    expect(bottom('focus')).toBeGreaterThanOrEqual(bottom('countdowns') + 260)
    // La pila dice cuánto ocupa, para que en el móvil se pueda subir la página por encima.
    expect(document.documentElement.style.getPropertyValue('--dock-room')).not.toBe('0px')
  }, 20_000)

  it('con el teclado: Espacio la coge, las flechas la mueven y se recuerda', async () => {
    const user = userEvent.setup()

    await both()

    const grip = screen.getByRole('button', { name: fill('dock.grip', { title: COUNTDOWN }) })

    grip.focus()
    await user.keyboard(' ')
    expect(grip.getAttribute('aria-pressed')).toBe('true')
    expect(said()).toBe(fill('dock.grabbed', { title: COUNTDOWN, pos: 1, total: 2 }))

    await user.keyboard('{ArrowUp}')
    expect(said()).toBe(fill('dock.place', { title: COUNTDOWN, pos: 2, total: 2 }))
    expect(bottom('focus')).toBeLessThan(bottom('countdowns'))

    await user.keyboard(' ')
    expect(grip.getAttribute('aria-pressed')).toBe('false')
    expect(said()).toBe(fill('dock.dropped', { title: COUNTDOWN, pos: 2, total: 2 }))
    expect(saved().order).toEqual(['focus', 'countdowns'])

    // Escape deshace lo movido desde que se cogió.
    await user.keyboard(' ')
    await user.keyboard('{ArrowDown}')
    expect(bottom('countdowns')).toBeLessThan(bottom('focus'))
    await user.keyboard('{Escape}')
    expect(said()).toBe(fill('dock.cancelled', { title: COUNTDOWN }))
    expect(bottom('focus')).toBeLessThan(bottom('countdowns'))
    expect(saved().order).toEqual(['focus', 'countdowns'])
  }, 20_000)

  it('arrastrando: lejos flota, «volver» la devuelve y soltada en la esquina cambia el orden', async () => {
    const user = userEvent.setup()

    await both()

    const grip = screen.getByRole('button', { name: fill('dock.grip', { title: FOCUS }) })
    const box = slot('focus')

    // Lejos de la pila: mientras se arrastra, sigue al puntero; al soltar, flota ahí.
    await act(async () => {
      fireEvent.pointerDown(grip, { button: 0, pointerId: 1, clientX: 5, clientY: 5 })
      fireEvent.pointerMove(grip, { pointerId: 1, clientX: 600, clientY: 200 })
      await Promise.resolve()
    })
    expect(box.dataset.dockState).toBe('dragging')
    await act(async () => {
      fireEvent.pointerUp(grip, { pointerId: 1, clientX: 600, clientY: 200 })
      await Promise.resolve()
    })
    expect(box.dataset.dockState).toBe('floating')
    expect(box.style.top).toBe('195px')
    expect(saved().floating.focus).toEqual({ left: 595, top: 195 })
    expect(said()).toBe(fill('dock.floated', { title: FOCUS }))
    // La cuenta atrás se queda sola en la esquina.
    expect(bottom('countdowns')).toBe(16)

    // «Volver a la esquina» la pone en su hueco de antes.
    await user.click(screen.getByRole('button', { name: fill('dock.back', { title: FOCUS }) }))
    expect(box.dataset.dockState).toBe('docked')
    expect(saved().floating).toEqual({})
    expect(bottom('focus')).toBeGreaterThan(bottom('countdowns'))

    // Soltada justo en la esquina, pasa delante: la cuenta atrás sube a dejarle sitio.
    const corner = window.innerHeight - 16 - 80

    await act(async () => {
      fireEvent.pointerDown(grip, { button: 0, pointerId: 2, clientX: 5, clientY: 5 })
      fireEvent.pointerMove(grip, { pointerId: 2, clientX: 21, clientY: corner + 5 })
      await Promise.resolve()
    })
    // Mientras tanto, la otra ya se ha apartado.
    expect(bottom('countdowns')).toBeGreaterThan(16)
    await act(async () => {
      fireEvent.pointerUp(grip, { pointerId: 2 })
      await Promise.resolve()
    })
    expect(box.dataset.dockState).toBe('docked')
    expect(bottom('focus')).toBe(16)
    expect(saved().order.indexOf('focus')).toBeLessThan(saved().order.indexOf('countdowns'))
    expect(said()).toBe(fill('dock.place', { title: FOCUS, pos: 1, total: 2 }))
  }, 20_000)

  it('plegada encoge su hueco, y en la vista de cuentas atrás la ventanita no ocupa sitio', async () => {
    const user = userEvent.setup()

    await both()

    const before = bottom('focus')

    await user.click(screen.getByRole('button', { name: fill('dock.fold', { title: COUNTDOWN }) }))
    expect(bottom('focus')).toBeLessThan(before)
    expect(saved().folded).toEqual({ countdowns: true })
    // Plegado, el Pomodoro sigue diciendo el tiempo, sin sus botones.
    await user.click(screen.getByRole('button', { name: fill('dock.fold', { title: FOCUS }) }))
    const timer = screen.getByRole('timer', { name: text('focus.timerLabel') })

    expect(timer.textContent).toMatch(/\d+:\d\d/)
    expect(within(timer).queryByRole('button', { name: text('focus.stop') })).toBeNull()

    await user.click(screen.getByRole('button', { name: fill('dock.unfold', { title: FOCUS }) }))
    expect(within(timer).getByRole('button', { name: text('focus.stop') })).toBeTruthy()

    // Con la vista de cuentas atrás del calendario abierta, la ventanita deja su hueco.
    act(() => {
      markCountdownsPage(true)
    })
    expect(document.querySelector('[data-dock="countdowns"]')).toBeNull()
    expect(bottom('focus')).toBe(16)
    act(() => {
      markCountdownsPage(false)
    })
    expect(await screen.findByRole('complementary', { name: COUNTDOWN })).toBeTruthy()
  }, 20_000)

  it('lo guardado roto o de otra versión no rompe nada: vale lo que tiene buena forma', () => {
    localStorage.setItem(
      'sanatorio_dock',
      JSON.stringify({
        order: [1, 'countdowns', null],
        floating: { countdowns: { left: 'x', top: 3 }, focus: { left: 40, top: 50 } },
        folded: { countdowns: true, focus: 'sí' },
      }),
    )
    resetDock()
    expect(floatingAt('countdowns')).toBeNull()
    expect(floatingAt('focus')).toEqual({ left: 40, top: 50 })
    expect(foldedOf('countdowns')).toBe(true)
    expect(foldedOf('focus')).toBe(false)

    for (const broken of ['{no es json', '[1,2]', 'null']) {
      localStorage.setItem('sanatorio_dock', broken)
      resetDock()
      expect(floatingAt('focus')).toBeNull()
      expect(foldedOf('countdowns')).toBe(false)
    }
    localStorage.clear()
    resetDock()
  })
})
