import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BoardForm } from '../../src/features/boards/BoardForm'
import { api } from '../../src/shared/api'
import { dayKey } from '../../src/shared/day'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function open(onSaved: () => void): string {
  const day = dayKey(new Date(Date.now() + 2 * 24 * 3_600_000))

  localStorage.setItem('sanatorio_lang', 'es')
  render(
    <I18nProvider>
      <BoardForm defaultDay={day} onCancel={() => undefined} onSaved={onSaved} />
    </I18nProvider>,
  )

  return day
}

describe('Proponer una pizarra', () => {
  it('se dice cuánto falta antes de guardar y, si se confirma, se crea con lo escrito', async () => {
    const user = userEvent.setup()
    const saved = vi.fn()
    const create = vi.spyOn(api, 'createBoard')
    const day = open(saved)

    await user.type(screen.getByLabelText(text('cal.f.title')), 'Punteros sin miedo')
    await user.type(screen.getByLabelText(text('cal.f.place')), 'Cluster 1')
    await user.clear(screen.getByLabelText(text('cal.f.capacity')))
    await user.type(screen.getByLabelText(text('cal.f.capacity')), '6')
    await user.click(screen.getByRole('button', { name: text('cal.f.create') }))

    // Antes de guardar, la ventana de la web pregunta; su botón dice qué hace.
    const asked = await screen.findByRole('dialog', { name: text('confirm.title') })

    expect(create).not.toHaveBeenCalled()
    await user.click(within(asked).getByRole('button', { name: text('cal.f.create') }))

    await waitFor(() => {
      expect(saved).toHaveBeenCalledOnce()
    })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Punteros sin miedo',
        place: 'Cluster 1',
        capacity: 6,
        startsAt: new Date(`${day}T17:00:00`).toISOString(),
        endsAt: new Date(`${day}T18:30:00`).toISOString(),
      }),
    )
  })

  it('si no se confirma, no se manda nada', async () => {
    const user = userEvent.setup()
    const create = vi.spyOn(api, 'createBoard')

    open(() => undefined)

    await user.type(screen.getByLabelText(text('cal.f.title')), 'Otra')
    await user.type(screen.getByLabelText(text('cal.f.place')), 'Cluster 2')
    await user.click(screen.getByRole('button', { name: text('cal.f.create') }))

    const asked = await screen.findByRole('dialog', { name: text('confirm.title') })

    await user.click(within(asked).getByRole('button', { name: text('confirm.cancel') }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(create).not.toHaveBeenCalled()
  })
})
