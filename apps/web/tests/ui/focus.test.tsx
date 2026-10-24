import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { api } from '../../src/shared/api'
import { stopFocus } from '../../src/shared/focus'
import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(async () => {
  await api.stopFocus()
  cleanup()
})

describe('modo concentración (Pomodoro)', () => {
  it('se empieza desde el menú: la web se queda con lo elegido y sale el temporizador; al acabar, vuelve todo', async () => {
    const user = userEvent.setup()

    await openApp('#/expediente')
    const nav = await screen.findByRole('navigation', { name: text('nav.label') })
    const before = within(nav).getAllByRole('button').length

    await user.click(screen.getByRole('button', { name: /tu cuenta/i }))
    await user.click(await screen.findByRole('menuitem', { name: text('focus.open') }))

    const dialog = await screen.findByRole('dialog', { name: text('focus.title') })

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

  it('al empezarlo, una pestaña que no se ha elegido se cierra y se vuelve al expediente', async () => {
    const user = userEvent.setup()
    const start = async (): Promise<void> => {
      await user.click(screen.getByRole('button', { name: /tu cuenta/i }))
      await user.click(await screen.findByRole('menuitem', { name: text('focus.open') }))
      const dialog = await screen.findByRole('dialog', { name: text('focus.title') })

      await user.click(
        within(dialog).getByRole('button', { name: new RegExp(text('focus.start')) }),
      )
      await screen.findByRole('timer', { name: text('focus.timerLabel') })
    }

    // El calendario está elegido por defecto: se queda donde está.
    await openApp('#/calendario')
    await start()
    expect(window.location.hash).toBe('#/calendario')
    await act(() => stopFocus(['done']))
    cleanup()

    // El tablón no: se vuelve al expediente, y por un enlace tampoco se entra.
    await openApp('#/tablon')
    await start()
    await waitFor(() => {
      expect(window.location.hash).toMatch(/^#\/expediente/)
    })
    window.location.hash = '#/tablon'
    await waitFor(() => {
      expect(window.location.hash).toMatch(/^#\/expediente/)
    })
  }, 20_000)

  it('tus estadísticas: cifras con la media del tramo, por días, por horas y motivos', async () => {
    const user = userEvent.setup()

    await openApp('#/expediente')
    await user.click(screen.getByRole('button', { name: /tu cuenta/i }))
    await user.click(await screen.findByRole('menuitem', { name: text('focus.open') }))

    const dialog = await screen.findByRole('dialog', { name: text('focus.title') })

    await user.click(within(dialog).getByRole('tab', { name: text('focus.tab.stats') }))
    await user.click(within(dialog).getByRole('button', { name: text('focus.period.total') }))

    // La demostración trae meses de sesiones inventadas: hay de todo.
    expect(await within(dialog).findByText(text('focus.stats.sessions'))).toBeTruthy()
    expect(within(dialog).getAllByText(/^Media del tramo/).length).toBeGreaterThan(0)
    expect(within(dialog).getByRole('img', { name: text('focus.stats.byDay') })).toBeTruthy()
    expect(within(dialog).getByRole('img', { name: text('focus.stats.byHour') })).toBeTruthy()
    expect(
      within(dialog).getByRole('rowheader', { name: text('focus.reason.urgent') }),
    ).toBeTruthy()

    // El tramo: el tirador de la izquierda deja fuera a quien menos lo usa.
    const low = within(dialog).getByRole('slider', { name: text('focus.band.low') })

    fireEvent.change(low, { target: { value: '2' } })
    expect(await within(dialog).findByText(/Comparas con el tramo del 10 %/)).toBeTruthy()
  }, 20_000)
})
