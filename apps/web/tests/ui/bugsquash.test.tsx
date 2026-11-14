/**
 * «Aplasta bugs» (#104 del buzón): el minijuego de la espera, en la pantalla
 * de mantenimiento y en la de «no se puede conectar», jugado como lo haría
 * una persona.
 */
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BugSquash } from '../../src/features/maintenance/BugSquash'
import { api } from '../../src/shared/api'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'
import { openApp, settle } from './render'

const WAIT = { timeout: 5000 }
const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

const play = () => {
  localStorage.setItem('sanatorio_lang', 'es')
  render(
    <I18nProvider>
      <BugSquash />
    </I18nProvider>,
  )
}

describe('aplasta bugs', () => {
  it('normal: se empieza, se aplasta el bug y el marcador lo cuenta', async () => {
    const user = userEvent.setup()

    play()
    // Antes de empezar, las casillas no se pueden pulsar.
    const board = screen.getByRole('group', { name: text('bugsquash.board') })

    expect(
      within(board)
        .getAllByRole('button')
        .every((cell) => cell.hasAttribute('disabled')),
    ).toBe(true)
    await user.click(screen.getByRole('button', { name: text('bugsquash.start') }))
    await user.click(within(board).getByRole('button', { name: text('bugsquash.bug') }))
    expect(screen.getByRole('status').textContent).toMatch(/Aplastados: 1/)
  })

  it('imprevisible: pulsar una casilla vacía no suma', async () => {
    const user = userEvent.setup()

    play()
    await user.click(screen.getByRole('button', { name: text('bugsquash.start') }))
    const empty = must(
      screen.getAllByRole('button', { name: text('bugsquash.empty') })[0],
      'una casilla vacía',
    )

    await user.click(empty)
    expect(screen.getByRole('status').textContent).toMatch(/Aplastados: 0/)
  })

  it('límite: al acabar el tiempo se guarda el récord y se puede volver a jugar', async () => {
    const user = userEvent.setup()

    play()
    await user.click(screen.getByRole('button', { name: text('bugsquash.start') }))
    await user.click(screen.getByRole('button', { name: text('bugsquash.bug') }))
    // Pasan los 30 segundos.
    const later = Date.now() + 31_000

    vi.spyOn(Date, 'now').mockReturnValue(later)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400))
    })
    expect(screen.getByRole('status').textContent).toMatch(/Has aplastado 1/)
    expect(screen.getByRole('status').textContent).toMatch(/Récord: 1/)
    expect(screen.getByRole('button', { name: text('bugsquash.again') })).toBeTruthy()
    expect(screen.queryByRole('button', { name: text('bugsquash.bug') })).toBeNull()
  })
})

describe('dónde sale', () => {
  it('en la pantalla de mantenimiento', async () => {
    vi.spyOn(api, 'getMaintenance').mockResolvedValue({
      on: true,
      message: null,
      until: null,
      since: new Date().toISOString(),
      exempt: false,
    })
    await openApp('#/')
    expect(await screen.findByRole('heading', { name: text('bugsquash.title') }, WAIT)).toBeTruthy()
  }, 20_000)

  it('vacío: con la API caída (un despliegue), en la de «no se puede conectar»', async () => {
    vi.spyOn(api, 'getMe').mockRejectedValue(new Error('502'))
    await openApp('#/')
    await settle(300)
    expect(await screen.findByText(text('app.serverDown'), {}, WAIT)).toBeTruthy()
    expect(screen.getByRole('heading', { name: text('bugsquash.title') })).toBeTruthy()
  }, 20_000)
})
