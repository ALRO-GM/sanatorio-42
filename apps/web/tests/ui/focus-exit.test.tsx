/**
 * Pomodoro (#80 del buzón): acabar no para en seco. Pregunta, pide un motivo y
 * da diez segundos para pensarlo; seguir felicita y se apunta. La pantalla
 * completa se quita sin parar, y Escape lleva a la misma pregunta.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import es from 'virtual:textos/es'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FocusTimer } from '../../src/features/focus/FocusTimer'
import { THINK_SECONDS } from '../../src/features/focus/FocusExit'
import { api } from '../../src/shared/api'
import { focusing, startFocus, stopFocus } from '../../src/shared/focus'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'

const text = (key: string): string => must(es[key], `el texto ${key}`)
const settings = {
  focusMinutes: 25,
  breakMinutes: 5,
  sections: ['expediente'],
  show: [],
}

/** Deja pasar ese tiempo del reloj de mentira, con lo que conteste la API de mentira. */
const pass = async (ms: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const button = (name: string, inside: HTMLElement = document.body): HTMLElement =>
  within(inside).getByRole('button', { name })

const today = () => {
  const offset = -new Date().getTimezoneOffset()

  return {
    from: new Date(Date.now() + offset * 60_000).toISOString().slice(0, 10),
    to: new Date(Date.now() + offset * 60_000).toISOString().slice(0, 10),
    offset,
  }
}

beforeEach(async () => {
  localStorage.setItem('sanatorio_lang', 'es')
  vi.useFakeTimers()
  const started = startFocus(settings)

  await vi.advanceTimersByTimeAsync(200)
  await started
  render(
    <I18nProvider>
      <FocusTimer />
    </I18nProvider>,
  )
  await pass(100)
})

afterEach(async () => {
  const stopped = stopFocus()

  await vi.advanceTimersByTimeAsync(200)
  await stopped
  cleanup()
  vi.useRealTimers()
})

describe('acabar un Pomodoro antes de tiempo', () => {
  it('pregunta, espera diez segundos y un motivo; seguir felicita; parar para', async () => {
    fireEvent.click(button(text('focus.stop')))

    let ask = screen.getByRole('dialog', { name: text('focus.exit.title') })
    const stop = (): HTMLElement => button(text('focus.exit.stop'), ask)

    expect(ask.textContent).toMatch(/2[45]:\d\d/)
    expect(within(ask).getByRole('status').textContent).toBe(
      text('focus.exit.wait').replace('{n}', String(THINK_SECONDS)),
    )
    expect(stop()).toHaveProperty('disabled', true)

    // Con un motivo y un segundo antes de tiempo, todavía no.
    fireEvent.click(within(ask).getByRole('checkbox', { name: text('focus.reason.tired') }))
    await pass((THINK_SECONDS - 1) * 1000)
    expect(stop()).toHaveProperty('disabled', true)
    await pass(1000)
    expect(stop()).toHaveProperty('disabled', false)

    // Sin motivo, tampoco: lo dice.
    fireEvent.click(within(ask).getByRole('checkbox', { name: text('focus.reason.tired') }))
    expect(stop()).toHaveProperty('disabled', true)
    expect(within(ask).getByRole('status').textContent).toBe(text('focus.exit.pick'))
    fireEvent.click(within(ask).getByRole('checkbox', { name: text('focus.reason.tired') }))

    // Se lo piensa y sigue.
    fireEvent.click(button(text('focus.exit.stay'), ask))
    await pass(200)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText(text('focus.exit.cheer'))).toBeTruthy()
    expect(focusing()).toBe(true)

    // Otra vez: la cuenta atrás vuelve a empezar, y ahora sí para.
    fireEvent.click(button(text('focus.stop')))
    ask = screen.getByRole('dialog', { name: text('focus.exit.title') })
    fireEvent.click(within(ask).getByRole('checkbox', { name: text('focus.reason.urgent') }))
    expect(stop()).toHaveProperty('disabled', true)
    await pass(THINK_SECONDS * 1000)
    fireEvent.click(stop())
    await pass(200)
    expect(focusing()).toBe(false)
    expect(screen.queryByRole('timer')).toBeNull()

    // Y queda en tus estadísticas de hoy: una vez que siguió y una parada urgente.
    const asked = api.getMyFocusStats(today())

    await vi.advanceTimersByTimeAsync(300)
    const stats = await asked

    expect(stats.totals).toMatchObject({ sessions: 1, cancelled: 1, stayed: 1 })
    expect(stats.reasons.find((one) => one.reason === 'urgent')?.cancelled).toBe(1)
    expect(stats.reasons.find((one) => one.reason === 'tired')?.stayed).toBe(1)
  }, 20_000)

  it('a pantalla completa: Escape pregunta; quitarla no para nada', async () => {
    fireEvent.click(button(text('focus.screen.open')))

    const full = screen.getByRole('dialog', { name: text('focus.screen.label') })

    expect(full.textContent).toContain(text('focus.screen.sign'))
    expect(within(full).getByRole('timer', { name: text('focus.timerLabel') })).toBeTruthy()

    // Escape en la pantalla completa: la misma pregunta que «Acabar».
    fireEvent(full, new Event('cancel', { cancelable: true }))
    const ask = screen.getByRole('dialog', { name: text('focus.exit.title') })

    // Escape en la pregunta es seguir.
    fireEvent(ask, new Event('cancel', { cancelable: true }))
    await pass(200)
    expect(screen.queryByRole('dialog', { name: text('focus.exit.title') })).toBeNull()
    expect(within(full).getByText(text('focus.exit.cheer'))).toBeTruthy()

    fireEvent.click(button(text('focus.screen.shrink'), full))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('timer', { name: text('focus.timerLabel') })).toBeTruthy()
    expect(focusing()).toBe(true)
  })
})
