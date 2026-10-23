import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../src/shared/api'
import { I18nProvider } from '../../src/shared/i18n'
import { ErrorBoundary } from '../../src/shared/ui/ErrorBoundary'
import { must } from './must'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Una sección que falla al pintarse', () => {
  it('enseña el aviso, manda el fallo y al volver a probar se pinta otra vez', async () => {
    const user = userEvent.setup()
    const reported = vi.spyOn(api, 'reportClientError').mockResolvedValue()
    let broken = true

    // React avisa en la consola de cada error recogido: aquí es lo esperado.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    function Section() {
      if (broken) throw new Error('se rompió')

      return <p>todo bien</p>
    }

    localStorage.setItem('sanatorio_lang', 'es')
    render(
      <I18nProvider>
        <ErrorBoundary where="tablon">
          <Section />
        </ErrorBoundary>
      </I18nProvider>,
    )

    expect(screen.getByRole('alert').textContent).toContain(text('app.sectionFailed'))
    expect(reported).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Error: se rompió', where: 'tablon' }),
    )

    broken = false
    await user.click(screen.getByRole('button', { name: text('app.retry') }))
    expect(screen.getByText('todo bien')).toBeTruthy()
  })
})
