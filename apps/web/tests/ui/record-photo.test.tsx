/**
 * El perfil: la foto de la cabecera se pulsa para verla en grande (#105) y los
 * nombres de otras personas que salen en él llevan a su perfil (#102).
 */
import { act, cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import es from 'virtual:textos/es'
import { setDetail } from '../../src/shared/detail'
import { recordHref } from '../../src/shared/links'
import { openApp } from './render'

const WAIT = { timeout: 4000 }

/** El texto en español de una clave, con sus huecos rellenos. */
const text = (key: string, vars: Record<string, string> = {}): string => {
  const value = es[key]

  if (value === undefined) throw new Error(`no hay texto para ${key}`)

  return Object.entries(vars).reduce((out, [name, val]) => out.replace(`{${name}}`, val), value)
}

afterEach(() => {
  cleanup()
  setDetail('normal')
})

describe('perfil: foto en grande', () => {
  it('normal: la foto de otra persona se abre en grande y Escape la cierra', async () => {
    const user = userEvent.setup()

    await openApp('#/expediente/mgarcia')
    const photo = await screen.findByRole(
      'button',
      { name: text('record.photo.open', { login: 'mgarcia' }) },
      WAIT,
    )

    await user.click(photo)
    const dialog = await screen.findByRole('dialog', {
      name: text('record.photo.title', { login: 'mgarcia' }),
    })
    const big = within(dialog).getByRole('img', { name: 'mgarcia' })

    expect(big.getAttribute('src')).toMatch(/^data:image\/svg/)
    // Escape: `cancel` y cierre, como hace el navegador.
    act(() => {
      const cancel = new Event('cancel', { cancelable: true })

      dialog.dispatchEvent(cancel)
      if (!cancel.defaultPrevented) (dialog as HTMLDialogElement).close()
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('vacío: sin foto (la inicial) no hay nada que ampliar ni botón', async () => {
    // En la demo, la cuenta propia no tiene foto.
    await openApp('#/expediente')
    await screen.findByRole('progressbar', {}, WAIT)

    expect(
      screen.queryByRole('button', { name: text('record.photo.open', { login: 'plopez-l' }) }),
    ).toBeNull()
  })

  it('imprevisible: abrir y cerrar varias veces deja una sola ventana', async () => {
    const user = userEvent.setup()

    await openApp('#/expediente/mgarcia')
    const photo = await screen.findByRole(
      'button',
      { name: text('record.photo.open', { login: 'mgarcia' }) },
      WAIT,
    )

    for (let round = 0; round < 3; round += 1) {
      await user.click(photo)
      expect(await screen.findAllByRole('dialog')).toHaveLength(1)
      await user.click(screen.getByRole('button', { name: text('layout.close') }))
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull()
      })
    }
  })
})

describe('perfil: los nombres llevan a su perfil', () => {
  it('normal: con quién te cruzas más en la red enlaza al perfil de cada cual', async () => {
    setDetail('datos')
    await openApp('#/expediente')
    const list = await screen.findByText(text('net.mostWith'), {}, WAIT)
    const rows = list.nextElementSibling as HTMLElement
    const links = await within(rows).findAllByRole('link', {}, WAIT)

    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link.getAttribute('href')).toBe(recordHref(link.textContent))
    }
  })
})
