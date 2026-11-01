import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../src/shared/api'
import { I18nProvider } from '../../src/shared/i18n'
import { reloadPage } from '../../src/shared/reload'
import { ErrorBoundary } from '../../src/shared/ui/ErrorBoundary'
import { must } from './must'

// jsdom no recarga: se mira que se pida.
vi.mock('../../src/shared/reload', () => ({ reloadPage: vi.fn() }))

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Una sección que falla al pintarse', () => {
  it('enseña el aviso, manda el fallo y «Reintentar» recarga la página', async () => {
    const user = userEvent.setup()
    const reported = vi.spyOn(api, 'reportClientError').mockResolvedValue()

    // React avisa en la consola de cada error recogido: aquí es lo esperado.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    function Section(): never {
      throw new Error('se rompió')
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

    await user.click(screen.getByRole('button', { name: text('app.retry') }))
    expect(reloadPage).toHaveBeenCalledOnce()
  })
})
