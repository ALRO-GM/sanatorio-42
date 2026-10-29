import { act, cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { api } from '../../src/shared/api'
import { stopFocus } from '../../src/shared/focus'
import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)

/** La pestaña del Pomodoro (Aprender), ya pintada. */
const page = async (): Promise<HTMLElement> =>
  must(
    (
      await screen.findByRole(
        'heading',
        { name: new RegExp(text('focus.title')) },
        { timeout: 5000 },
      )
    ).parentElement,
    'la página del Pomodoro',
  )

afterEach(async () => {
  await api.stopFocus()
  cleanup()
})

describe('modo concentración (Pomodoro)', () => {
  it('se empieza desde su pestaña: la web se queda con lo elegido y sale el temporizador; al acabar, vuelve todo', async () => {
    const user = userEvent.setup()

    await openApp('#/pomodoro')
    const nav = await screen.findByRole('navigation', { name: text('nav.label') })
    const before = within(nav).getAllByRole('button').length
    const dialog = await page()

    // Por defecto: el calendario (el expediente siempre se ve); los juegos, fuera.
    expect(within(dialog).getByRole('checkbox', { name: text('nav.calendario') })).toHaveProperty(
      'checked',
      true,
    )
    expect(within(dialog).getByRole('checkbox', { name: text('nav.notgames') })).toHaveProperty(
      'checked',
      false,
    )
    await user.click(within(dialog).getByRole('button', { name: new RegExp(text('focus.start')) }))

    const timer = await screen.findByRole('timer', { name: text('focus.timerLabel') })

    expect(timer.textContent).toMatch(/2[45]:\d\d/)
    expect(document.documentElement.dataset.focus).toBe('on')
    await waitFor(() => {
      expect(within(nav).getAllByRole('button').length).toBeLessThan(before)
    })

    // Acabar pregunta antes (eso se prueba en `focus-exit.test.tsx`): aquí se para sin más.
    await act(() => stopFocus(['done']))
    await waitFor(() => {
      expect(document.documentElement.dataset.focus).toBe('off')
    })
    expect(within(nav).getAllByRole('button')).toHaveLength(before)
  }, 20_000)

  it('al empezarlo, una pestaña que no se ha elegido no se puede abrir: se vuelve al expediente', async () => {
    const user = userEvent.setup()
    await openApp('#/pomodoro')
    await user.click(
      within(await page()).getByRole('button', { name: new RegExp(text('focus.start')) }),
    )
    await screen.findByRole('timer', { name: text('focus.timerLabel') })
    // Su propia pestaña sigue abierta: es donde se lleva.
    expect(window.location.hash).toBe('#/pomodoro')

    // El calendario está elegido por defecto: se puede ir.
    window.location.hash = '#/calendario'
    await waitFor(() => {
      expect(window.location.hash).toBe('#/calendario')
    })
    // El tablón no: por un enlace no se entra, se vuelve al expediente.
    window.location.hash = '#/tablon'
    await waitFor(() => {
      expect(window.location.hash).toMatch(/^#\/expediente/)
    })
  }, 20_000)

  it('tus estadísticas: cifras con la media del tramo, por días, por horas y motivos', async () => {
    const user = userEvent.setup()

    await openApp('#/pomodoro')

    const dialog = await page()

    await user.click(within(dialog).getByRole('tab', { name: text('focus.tab.stats') }))
    // El periodo, con el selector de toda la web (`StepPicker`): un desplegable.
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: text('focus.stats.period') }),
      text('focus.period.total'),
    )

    // La demostración trae meses de sesiones inventadas: hay de todo.
    expect(await within(dialog).findByText(text('focus.stats.sessions'))).toBeTruthy()
    expect(within(dialog).getAllByText(/^Media del tramo/).length).toBeGreaterThan(0)
    expect(within(dialog).getByRole('img', { name: text('focus.stats.byDay') })).toBeTruthy()
    expect(within(dialog).getByRole('img', { name: text('focus.stats.byHour') })).toBeTruthy()
    expect(
      within(dialog).getByRole('rowheader', { name: text('focus.reason.urgent') }),
    ).toBeTruthy()

    // El tramo: el tirador de la izquierda deja fuera a quien menos lo usa.
    // Con el teclado: Mayúsculas y la flecha, de diez en diez.
    const low = within(dialog).getByRole('slider', { name: text('focus.band.low') })

    low.focus()
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}')
    expect(await within(dialog).findByText(/Comparas con el tramo del 10 %/)).toBeTruthy()
    // O escribiendo el número exacto: cualquiera, no solo de cinco en cinco.
    await user.click(
      within(dialog).getByRole('button', {
        name: text('range.edit').replace('{what}', text('focus.band.low')),
      }),
    )
    await user.keyboard('{Control>}a{/Control}14{Enter}')
    expect(await within(dialog).findByText(/Comparas con el tramo del 14 %/)).toBeTruthy()
  }, 20_000)
})
