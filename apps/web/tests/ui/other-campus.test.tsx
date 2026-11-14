import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { OtherCampusNotice } from '../../src/features/campus/OtherCampusNotice'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const show = (campusId: number) =>
  render(
    <I18nProvider>
      <OtherCampusNotice campusId={campusId} />
    </I18nProvider>,
  )

describe('aviso para otros campus', () => {
  it('desde un campus que no se copia sale el aviso, y al cerrarlo no vuelve', async () => {
    const user = userEvent.setup()

    localStorage.setItem('sanatorio_lang', 'es')
    show(58)
    expect(await screen.findByText(/Tu campus, Barcelona, todavía no está/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: text('common.ok') }))
    expect(screen.queryByText(/Tu campus, Barcelona/)).toBeNull()

    cleanup()
    show(58)
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(screen.queryByText(/Tu campus, Barcelona/)).toBeNull()
  })

  it('dice las cifras de ahora: diez personas más para añadirlo y cincuenta para el idioma (#92)', async () => {
    localStorage.setItem('sanatorio_lang', 'es')
    show(58)
    const notice = await screen.findByText(/Tu campus, Barcelona/)

    expect(notice.textContent).toMatch(/Si se apuntan 10 personas más de Barcelona/)
    expect(notice.textContent).toMatch(/con 50, también el idioma/)
    // Ningún hueco sin rellenar.
    expect(notice.textContent).not.toMatch(/[{}]/)
  })

  it('en inglés, las mismas cifras', async () => {
    localStorage.setItem('sanatorio_lang', 'en')
    show(58)
    const notice = await screen.findByText(/Your campus, Barcelona/)

    expect(notice.textContent).toMatch(/If 10 more people from Barcelona join/)
    expect(notice.textContent).toMatch(/with 50, the language too/)
  })

  it('desde un campus que sí se copia no sale nada', async () => {
    localStorage.setItem('sanatorio_lang', 'es')
    show(22)
    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(screen.queryByRole('status')).toBeNull()
  })
})
