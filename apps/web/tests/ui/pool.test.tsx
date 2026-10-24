import { cleanup, render, screen } from '@testing-library/react'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { App } from '../../src/app/App'
import { api } from '../../src/shared/api'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/')
})

/** La entrada, sin sesión, como vuelve de 42 con `?error=…`. */
function backFrom42(error: string): void {
  localStorage.clear()
  localStorage.setItem('sanatorio_lang', 'es')
  localStorage.setItem('mock_logged_in', 'false')
  window.history.replaceState({}, '', `/?error=${error}&status=403`)
  render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  )
}

describe('quién entra (docs/piscineros.md)', () => {
  it('una cuenta que no es de estudiante ve por qué no entra, y la URL se limpia', async () => {
    backFrom42('not_student')

    expect(await screen.findByText(text('login.notStudent'), {}, { timeout: 5000 })).toBeTruthy()
    expect(window.location.search).toBe('')
  })

  it('un piscinero con la piscina cerrada ve el aviso del panel o, sin él, el de fábrica', async () => {
    backFrom42('pool_closed')
    expect(await screen.findByText(text('login.poolClosed'), {}, { timeout: 5000 })).toBeTruthy()
    cleanup()

    await api.updatePoolSettings({ message: 'La piscina abre el lunes.' })
    backFrom42('pool_closed')
    expect(await screen.findByText('La piscina abre el lunes.', {}, { timeout: 5000 })).toBeTruthy()
    await api.updatePoolSettings({ message: '' })
  })
})
