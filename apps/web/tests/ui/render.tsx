import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import es from 'virtual:textos/es'

import { App } from '../../src/app/App'
import { api } from '../../src/shared/api'
import { resetDock } from '../../src/shared/dock/store'
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
export async function openApp(
  hash: string,
  {
    pool = false,
    preview = false,
    detail,
  }: { pool?: boolean; preview?: boolean; detail?: 'simple' | 'normal' | 'datos' } = {},
): Promise<void> {
  localStorage.clear()
  // Como piscinero (`docs/piscineros.md`): la API de mentira contesta con lo permitido.
  if (pool) localStorage.setItem('mock_pool', 'true')
  // Quien administra, en la vista de piscinero del panel.
  if (preview) localStorage.setItem('mock_pool_preview', 'true')
  if (detail !== undefined) localStorage.setItem('sanatorio_detail', detail)
  localStorage.setItem('sanatorio_welcome_seen', '1')
  localStorage.setItem('sanatorio_lang', 'es')
  // La pila de ventanitas de la esquina olvida el orden y lo plegado del test anterior.
  resetDock()
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
  await answerGates()
}

/**
 * Contesta las ventanas obligatorias que haya abiertas (una petición de ayuda,
 * un comunicado…), como haría cualquiera: con el primer botón de sus acciones.
 * Salen según cuándo llegue el pulso, así que sin esto un test podría
 * encontrárselas o no según lo rápida que sea la máquina.
 */
export async function answerGates(): Promise<void> {
  for (let round = 0; round < 5; round++) {
    const gate = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].find(
      (dialog) => !dialog.classList.contains('welcome') && !dialog.classList.contains('legal-gate'),
    )
    // El aviso de un evento que empieza ya (una guardia de mentira cerca de la
    // hora a la que corre el test) no tiene botones de acción: se cierra.
    const button =
      gate?.querySelector<HTMLButtonElement>('.actions button:not([disabled])') ??
      gate?.querySelector<HTMLButtonElement>('.event-sheet-head .icon-btn')

    if (button === undefined || button === null) return

    await act(async () => {
      button.click()
      await new Promise((resolve) => setTimeout(resolve, 300))
    })
  }
}

/**
 * La Red y Amigos se abren con tu propia red (2026-10-30). Para mirar a todo el
 * campus, como quien la usa: se quita a la persona elegida.
 */
export async function wholeCampus(): Promise<void> {
  // En la Red, la × de la persona elegida; en Amigos, vaciar el buscador.
  const found = await waitFor(
    () => {
      const clear = screen.queryByRole('button', { name: es['net.person.clear'] ?? '' })
      const search = screen.queryByRole('combobox', { name: es['common.person'] ?? '' })

      if (clear === null && search === null) throw new Error('sin persona elegida que quitar')

      return clear ?? search
    },
    { timeout: 5000 },
  )

  if (found?.tagName === 'BUTTON') fireEvent.click(found)
  else if (found !== null) fireEvent.change(found, { target: { value: '' } })
}
