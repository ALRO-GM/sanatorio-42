/**
 * Estadísticas del Pomodoro por fechas elegidas a mano (#80 del buzón).
 */
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
})

describe('Pomodoro: estadísticas por fechas', () => {
  it('«Fechas…» abre desde y hasta, y las cifras siguen a la vista', async () => {
    const user = userEvent.setup()

    await openApp('#/pomodoro')
    const tab = await screen.findByRole('tab', { name: text('focus.tab.stats') }, { timeout: 5000 })

    await user.click(tab)
    const period = await screen.findByRole('combobox', { name: text('focus.stats.period') })

    // Sin «Fechas…», no hay campos de fecha.
    expect(screen.queryByLabelText(text('common.from'))).toBeNull()
    await user.selectOptions(period, text('focus.period.custom'))

    const from = screen.getByLabelText(text('common.from'))
    const to = screen.getByLabelText(text('common.to'))

    // Con una sola fecha se sigue viendo algo (el mes), no una zona en blanco.
    expect(await screen.findByText(text('focus.stats.sessions'))).toBeTruthy()
    fireEvent.change(from, { target: { value: '2026-09-01' } })
    fireEvent.change(to, { target: { value: '2026-11-14' } })
    expect(to.getAttribute('min')).toBe('2026-09-01')
    expect(from.getAttribute('max')).toBe('2026-11-14')
    const section = must(period.closest('section'), 'las estadísticas')

    expect(await within(section).findByText(text('focus.stats.sessions'))).toBeTruthy()
  }, 20_000)
})
