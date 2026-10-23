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

  it('desde un campus que sí se copia no sale nada', async () => {
    localStorage.setItem('sanatorio_lang', 'es')
    show(22)
    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(screen.queryByRole('status')).toBeNull()
  })
})
