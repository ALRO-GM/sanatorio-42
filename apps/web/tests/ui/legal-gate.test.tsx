import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { expect, it } from 'vitest'

import { App } from '../../src/app/App'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'
import { settle } from './render'

it('las condiciones salen a quien no las ha aceptado, se aceptan y no vuelven', async () => {
  const user = userEvent.setup()
  const accept = must(es['legal.accept'], 'el texto de aceptar')

  localStorage.clear()
  localStorage.setItem('sanatorio_welcome_seen', '1')
  localStorage.setItem('sanatorio_lang', 'es')
  window.location.hash = '#/expediente'
  render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  )

  // No se cierra con Escape: hay que aceptarlas.
  await user.click(await screen.findByRole('button', { name: accept }, { timeout: 5000 }))
  await settle(2000)
  expect(screen.queryByRole('button', { name: accept })).toBeNull()
  expect(document.querySelector('dialog.legal-gate[open]')).toBeNull()
}, 20_000)
