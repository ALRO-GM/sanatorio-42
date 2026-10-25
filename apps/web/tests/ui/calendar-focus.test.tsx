import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { api } from '../../src/shared/api'
import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
})

describe('calendario: abrir un evento desde la dirección', () => {
  it('abre la ficha de una pizarra y deja apuntarse desde ella', async () => {
    const user = userEvent.setup()
    const now = new Date()
    const { events } = await api.getCalendar(
      now.toISOString(),
      new Date(now.getTime() + 60 * 86_400_000).toISOString(),
    )
    const board = must(
      events.find((event) => event.id.startsWith('board:') && event.joined === false),
      'una pizarra a la que no vas',
    )

    await openApp(`#/calendario/${encodeURIComponent(board.id)}`)

    // Por su título: a según qué hora el calendario abre también el aviso de un
    // evento que empieza ya (una guardia), en otro diálogo.
    const dialog = await screen.findByRole('dialog', { name: board.title }, { timeout: 5000 })

    expect(within(dialog).getByText(board.title)).toBeTruthy()
    // La dirección vuelve a la del calendario: recargar no la reabre.
    expect(window.location.hash).toBe('#/calendario')

    await user.click(within(dialog).getByRole('button', { name: new RegExp(text('agenda.join')) }))
    expect(await within(dialog).findByText(text('agenda.joined'))).toBeTruthy()
    expect(
      within(dialog).queryByRole('button', { name: new RegExp(text('agenda.join')) }),
    ).toBeNull()
  }, 20_000)
})
