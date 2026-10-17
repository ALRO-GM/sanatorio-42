import { act, render } from '@testing-library/react'

import { App } from '../../src/app/App'
import { api } from '../../src/shared/api'
import { I18nProvider } from '../../src/shared/i18n'

/** Deja pasar el tiempo para que la API de mentira conteste y se pinte. */
export async function settle(ms = 600): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms))
  })
}

/**
 * Pinta la web entera en esa dirección, con la API de mentira y en español, sin
 * la bienvenida ni las condiciones delante.
 */
export async function openApp(hash: string): Promise<void> {
  localStorage.clear()
  localStorage.setItem('sanatorio_welcome_seen', '1')
  localStorage.setItem('sanatorio_lang', 'es')
  // Alguien que ya aceptó las condiciones: su ventana no tapa lo que se prueba.
  const legal = await api.getLegal()

  if (legal.acceptedAt === null) await api.acceptLegal(legal.version)
  window.location.hash = hash
  render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  )
  await settle(900)
}
