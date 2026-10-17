import { act, fireEvent, render, screen } from '@testing-library/react'

import { App } from '../../src/app/App'
import { I18nProvider } from '../../src/shared/i18n'
import es from 'virtual:textos/es'

/** Deja pasar el tiempo para que la API de mentira conteste y se pinte. */
export async function settle(ms = 600): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms))
  })
}

/**
 * Pinta la web entera en esa dirección, con la API de mentira y en español, sin
 * la bienvenida delante.
 */
export async function openApp(hash: string): Promise<void> {
  localStorage.clear()
  localStorage.setItem('sanatorio_welcome_seen', '1')
  localStorage.setItem('sanatorio_lang', 'es')
  window.location.hash = hash
  render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  )
  await settle(900)
  // Como haría cualquiera la primera vez: acepta las condiciones.
  const accept = screen.queryByRole('button', { name: es['legal.accept'] ?? '' })

  if (accept !== null) {
    fireEvent.click(accept)
    await settle(300)
  }
}
