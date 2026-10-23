import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { HoursReport } from '../../src/features/profile/HoursReport'
import { saveFile } from '../../src/shared/download'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'

vi.mock('../../src/shared/download', () => ({ saveFile: vi.fn() }))

afterEach(() => {
  cleanup()
})

describe('Descarga de las horas validadas', () => {
  it('el botón pide el documento y lo guarda con el nombre que trae el código', async () => {
    const user = userEvent.setup()

    render(
      <I18nProvider>
        <HoursReport />
      </I18nProvider>,
    )
    await user.click(screen.getByRole('button', { name: must(es['hours.download'], 'el texto') }))

    await waitFor(() => {
      expect(saveFile).toHaveBeenCalledOnce()
    })
    expect(vi.mocked(saveFile).mock.calls[0]?.[1]).toMatch(/_K7QF\.csv$/)
  })
})
