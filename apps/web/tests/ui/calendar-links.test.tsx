/**
 * De una pizarra o de un grupo de sprint al calendario, con su ficha abierta
 * para apuntarse desde allí (#76 del buzón).
 */
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)
const WAIT = { timeout: 5000 }

afterEach(() => {
  cleanup()
})

describe('pizarras y grupos: abrir en el calendario', () => {
  it('normal: el enlace de una pizarra abre el calendario con su ficha', async () => {
    const user = userEvent.setup()

    await openApp('#/pizarras')
    const links = await screen.findAllByRole('link', { name: text('cal.openInCalendar') }, WAIT)
    const link = must(links[0], 'un enlace al calendario')
    const card = must(link.closest('article'), 'la tarjeta de la pizarra')
    const title = must(within(card).getByRole('heading').textContent, 'el título')

    expect(link.getAttribute('href')).toMatch(/^#\/calendario\/board%3A\d+$/)
    await user.click(link)
    const dialog = await screen.findByRole('dialog', { name: title }, WAIT)

    expect(within(dialog).getByText(title)).toBeTruthy()
    await waitFor(() => {
      expect(window.location.hash).toBe('#/calendario')
    })
  }, 20_000)

  it('vacío: una pizarra ya pasada no lleva enlace al calendario', async () => {
    await openApp('#/pizarras')
    await screen.findAllByRole('link', { name: text('cal.openInCalendar') }, WAIT)

    for (const past of screen.queryAllByText(text('cal.past'))) {
      const card = must(past.closest('article'), 'la tarjeta pasada')

      expect(within(card).queryByRole('link', { name: text('cal.openInCalendar') })).toBeNull()
    }
  }, 20_000)

  it('normal: un grupo en el que estás lleva al calendario con su próxima sesión', async () => {
    await openApp('#/terapia')
    const leave = await screen.findAllByRole('button', { name: text('therapy.leave') }, WAIT)
    const card = must(leave[0]?.closest('article'), 'un grupo en el que estás')
    const link = within(card).getByRole('link', { name: text('cal.openInCalendar') })

    expect(link.getAttribute('href')).toMatch(/^#\/calendario\/therapy%3A\d+$/)
  }, 20_000)

  it('permisos: un grupo en el que no estás no lleva enlace (tu calendario no lo trae)', async () => {
    await openApp('#/terapia')
    const joins = await screen.findAllByRole('button', { name: text('therapy.join') }, WAIT)

    for (const join of joins) {
      const card = must(join.closest('article'), 'la tarjeta del grupo')

      expect(within(card).queryByRole('link', { name: text('cal.openInCalendar') })).toBeNull()
    }
  }, 20_000)
})
