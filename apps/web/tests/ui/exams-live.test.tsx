import { act, cleanup, screen, waitFor, within } from '@testing-library/react'
import es from 'virtual:textos/es'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../src/shared/api'
import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)
/** El texto con su hueco `{time}` como patrón: lo que cuenta es el reloj. */
const clock = (key: string, time: string): RegExp =>
  new RegExp(`^${text(key).replace('{time}', time)}$`)

beforeEach(() => {
  // Relojes de mentira que avanzan solos (para que la API de mentira conteste)
  // y que se pueden adelantar de golpe.
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date(2026, 9, 22, 10, 0))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  cleanup()
})

/** Adelanta el reloj y deja que se pinte. */
async function pass(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('exámenes: el examen en vivo', () => {
  it('cuenta lo que falta para acabar y para refrescar, y el botón espera a su minuto', async () => {
    const reload = vi.spyOn(api, 'getLiveExam')
    const refresh = vi.spyOn(api, 'refreshLiveExam')

    await openApp('#/examenes')

    const ends = await screen.findByRole('timer', { name: text('exams.endsInLabel') })
    const next = screen.getByRole('timer', { name: text('exams.nextRefreshLabel') })

    // Empezó hace media hora y dura tres; el último refresco fue hace tres minutos.
    expect(ends.textContent).toMatch(clock('exams.endsIn', '2:(30:00|29:5\\d)'))
    expect(next.textContent).toMatch(clock('exams.nextRefresh', '(2:00|1:5\\d)'))

    // Cada cual con el examen de su círculo y cómo va: quien lo cerró sin 100, suspende.
    const failed = screen.getByText('llorente').closest('li')

    expect(within(must(failed, 'la fila')).getByText(text('exams.status.failed'))).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Exam Rank 02 · 42next/ })).toBeTruthy()

    // Hace más de un minuto del último refresco: se puede pulsar.
    const button = screen.getByRole('button', { name: text('exams.refresh') })

    expect((button as HTMLButtonElement).disabled).toBe(false)
    await act(async () => {
      button.click()
      await vi.advanceTimersByTimeAsync(300)
    })
    expect(refresh).toHaveBeenCalledTimes(1)

    // Recién refrescado: el botón espera un minuto y el siguiente refresco solo, cinco.
    await waitFor(() => {
      expect((button as HTMLButtonElement).disabled).toBe(true)
    })
    expect(next.textContent).toMatch(clock('exams.nextRefresh', '(5:00|4:5\\d)'))
    expect(screen.getByText(clock('exams.refreshIn', '(1:00|0:5\\d)'))).toBeTruthy()

    // A los 30 s sigue sin dejar, y los dos relojes han bajado.
    await pass(30_000)
    expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(next.textContent).toMatch(clock('exams.nextRefresh', '(4:30|4:2\\d)'))
    expect(ends.textContent).toMatch(clock('exams.endsIn', '2:2\\d:\\d\\d'))

    // Pasado el minuto, ya deja.
    await pass(31_000)
    expect((button as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByText(clock('exams.refreshIn', '.*'))).toBeNull()

    // A los cinco minutos del refresco, se vuelve a preguntar sola.
    const before = reload.mock.calls.length

    await pass(4 * 60_000 + 5_000)
    expect(reload.mock.calls.length).toBeGreaterThan(before)
  }, 30_000)
})
