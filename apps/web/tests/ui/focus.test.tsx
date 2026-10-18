import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { api } from '../../src/shared/api'
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

    // Por defecto: expediente y calendario; los juegos, fuera.
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

    await user.click(within(timer).getByRole('button', { name: text('focus.stop') }))
    await waitFor(() => {
      expect(document.documentElement.dataset.focus).toBe('off')
    })
    expect(within(nav).getAllByRole('button')).toHaveLength(before)
  }, 20_000)
})
