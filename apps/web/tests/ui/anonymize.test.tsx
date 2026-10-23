import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AnonymizeAccount } from '../../src/features/legal/AnonymizeAccount'
import { api } from '../../src/shared/api'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Anonimizar la cuenta', () => {
  it('hay que abrirlo y escribir el propio login; entonces se pide', async () => {
    const user = userEvent.setup()
    // Sin contestar: así la página no se recarga en el test.
    const asked = vi.spyOn(api, 'anonymizeMe').mockReturnValue(new Promise(() => undefined))

    localStorage.setItem('sanatorio_lang', 'es')
    render(
      <I18nProvider>
        <AnonymizeAccount login="ana" />
      </I18nProvider>,
    )

    await user.click(screen.getByRole('button', { name: text('legal.anonymize') }))

    const go = screen.getByRole('button', { name: text('legal.anonymizeGo') })
    const box = screen.getByRole('textbox')

    expect(go).toHaveProperty('disabled', true)
    await user.type(box, 'eva')
    expect(go).toHaveProperty('disabled', true)
    await user.clear(box)
    await user.type(box, 'ANA')
    await user.click(go)

    expect(asked).toHaveBeenCalledWith('ANA')
  })
})
