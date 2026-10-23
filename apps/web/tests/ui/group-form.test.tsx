import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GroupForm } from '../../src/features/therapy/GroupForm'
import { api } from '../../src/shared/api'
import { dayKey } from '../../src/shared/day'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Abrir un grupo de terapia', () => {
  it('con un día y dos puestos juntos se abre con lo elegido; sin días no se puede', async () => {
    const user = userEvent.setup()
    const saved = vi.fn()
    const create = vi.spyOn(api, 'createGroup')
    const day = dayKey(new Date(Date.now() + 3 * 24 * 3_600_000))

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    localStorage.setItem('sanatorio_lang', 'es')
    render(
      <I18nProvider>
        <GroupForm
          projects={[{ id: 1314, name: 'ft_printf' }]}
          defaultProject={1314}
          onCancel={() => undefined}
          onSaved={saved}
        />
      </I18nProvider>,
    )

    const open = screen.getByRole('button', { name: text('therapy.create') })

    // Sin ningún día no hay grupo que abrir.
    expect(open).toHaveProperty('disabled', true)

    fireEvent.change(screen.getByLabelText(text('therapy.addDate')), { target: { value: day } })
    await user.click(screen.getByRole('button', { name: text('therapy.addDate') }))

    const seats = screen.getByLabelText(text('therapy.seatsManual'))

    await user.type(seats, 'C1R2S3, c1r2s4')
    await user.tab()
    // El lugar se rellena solo con los puestos elegidos.
    expect(screen.getByLabelText(text('therapy.place'))).toHaveProperty(
      'value',
      'Clúster 1 · fila 2',
    )
    await user.click(open)

    await waitFor(() => {
      expect(saved).toHaveBeenCalledOnce()
    })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 1314,
        dates: [day],
        seats: ['c1r2s3', 'c1r2s4'],
        place: 'Clúster 1 · fila 2',
        kind: 'study',
      }),
    )
  })
})
