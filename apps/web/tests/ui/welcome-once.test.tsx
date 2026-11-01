/**
 * La bienvenida sale sola solo la primera vez que se entra: lo apunta la API,
 * así que no vuelve en otro navegador, en una ventana privada ni al volver a
 * entrar con 42.
 */

import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { Welcome } from '../../src/features/welcome/Welcome'
import { api } from '../../src/shared/api'
import { I18nProvider } from '../../src/shared/i18n'
import { settle } from './render'

const text = (key: string): string => es[key] ?? key

function show(welcomed: boolean | undefined): void {
  render(
    <I18nProvider>
      <Welcome open={false} welcomed={welcomed} onGo={() => undefined} onClose={() => undefined} />
    </I18nProvider>,
  )
}

describe('bienvenida solo la primera vez', () => {
  const saved = vi.spyOn(api, 'updateSettings')

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('sanatorio_lang', 'es')
    saved.mockReset().mockResolvedValue(undefined)
  })

  afterAll(() => {
    saved.mockRestore()
  })

  it('a quien entra por primera vez le sale, y al cerrarla se apunta en la API', async () => {
    const user = userEvent.setup()

    show(false)
    await settle(100)
    expect(screen.getByRole('dialog', { name: text('welcome.title') })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: text('welcome.skip') }))
    expect(saved).toHaveBeenCalledWith({ welcomed: true })
    expect(screen.queryByRole('dialog', { name: text('welcome.title') })).toBeNull()
  })

  it('a quien ya la vio no le sale, aunque este navegador no lo sepa', async () => {
    show(true)
    await settle(100)

    expect(screen.queryByRole('dialog', { name: text('welcome.title') })).toBeNull()
    expect(saved).not.toHaveBeenCalled()
  })

  it('mientras no se sabe, no sale', async () => {
    show(undefined)
    await settle(100)

    expect(screen.queryByRole('dialog', { name: text('welcome.title') })).toBeNull()
  })

  it('si la vio en este navegador antes de que la API lo guardara, se le dice a la API', async () => {
    localStorage.setItem('sanatorio_welcome_seen', '2026-10-30T10:00:00.000Z')

    await act(async () => {
      show(false)
      await Promise.resolve()
    })

    expect(screen.queryByRole('dialog', { name: text('welcome.title') })).toBeNull()
    expect(saved).toHaveBeenCalledWith({ welcomed: true })
  })
})
