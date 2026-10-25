import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../src/shared/api'
import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)

beforeEach(() => {
  // Solo el reloj: a media mañana, para que quede día por delante. Los
  // temporizadores siguen siendo de verdad.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 18, 11, 10))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  cleanup()
})

describe('guardia: las medias horas como un día del calendario', () => {
  it('se marcan franjas arrastrando o con el teclado, y se guardan juntas', async () => {
    const user = userEvent.setup()
    const save = vi.spyOn(api, 'setHelpDay')

    await openApp('#/guardia')

    // Si hay una sesión sin valorar, primero se valora (si no, no deja ofrecerse).
    const grid = await screen.findByRole('group', { name: text('help.today') }, { timeout: 5000 })
    const pending = document.querySelector<HTMLButtonElement>('.rating-options button')

    if (pending !== null) await user.click(pending)

    const slot = (time: string): HTMLButtonElement =>
      within(grid).getByRole('button', { name: new RegExp(`^${time}–`) })

    await waitFor(() => {
      expect(slot('15:00').disabled).toBe(false)
    })

    // Arrastrar de las 15:00 a las 16:30 marca las cuatro medias horas.
    const path = ['15:00', '15:30', '16:00', '16:30'].map(slot)
    let over = path[0]

    // jsdom no sabe qué hay bajo el puntero: se le dice.
    document.elementFromPoint = () => over ?? null
    fireEvent.pointerDown(must(path[0], 'la primera'), { button: 0, pointerId: 1 })
    for (const next of path.slice(1)) {
      over = next
      fireEvent.pointerMove(grid, { pointerId: 1 })
    }
    fireEvent.pointerUp(grid, { pointerId: 1 })

    expect(path.map((one) => one.getAttribute('aria-pressed'))).toEqual([
      'true',
      'true',
      'true',
      'true',
    ])
    // Y el bloque dice de cuándo a cuándo va.
    expect(within(grid).getByText('15:00–17:00')).toBeTruthy()

    // Arrastrar empezando en una marcada, quita.
    over = slot('16:30')
    fireEvent.pointerDown(slot('16:30'), { button: 0, pointerId: 1 })
    fireEvent.pointerUp(grid, { pointerId: 1 })
    expect(slot('16:30').getAttribute('aria-pressed')).toBe('false')

    // Con el teclado, otra franja aparte.
    slot('18:00').focus()
    await user.keyboard('{Enter}')
    expect(slot('18:00').getAttribute('aria-pressed')).toBe('true')

    await user.click(screen.getByRole('button', { name: text('help.save') }))
    await waitFor(() => {
      expect(save).toHaveBeenCalled()
    })
    expect(save.mock.calls.at(-1)?.[0].windows).toEqual([
      { start: '15:00', end: '16:30' },
      { start: '18:00', end: '18:30' },
    ])
  }, 30_000)
})
