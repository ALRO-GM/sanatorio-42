/**
 * Red: el buscador de persona es el de toda la web (`PersonInput`): por
 * nombre o login, con foto, y al elegir a alguien el grafo se centra en él.
 */
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
})

describe('Red: buscar a una persona', () => {
  it('por su nombre, con su foto y su login; al elegirla queda puesta', async () => {
    await openApp('#/red', { detail: 'datos' })
    // De entrada, centrada en tu red: se quita para buscar a otra persona.
    fireEvent.click(
      await screen.findByRole('button', { name: text('net.person.clear') }, { timeout: 5000 }),
    )
    const search = screen.getByRole('combobox', { name: text('common.person') })

    // «Rocío Soto» es rsoto en la API de mentira: se encuentra por el nombre.
    fireEvent.change(search, { target: { value: 'Rocío' } })
    const option = await screen.findByRole('option', { name: /rsoto/ })

    expect(option.textContent).toContain('Rocío Soto')
    expect(option.querySelector('.avatar, img')).not.toBeNull()

    fireEvent.mouseDown(option)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: text('net.person.clear') })).toBeTruthy()
    })
    expect(document.querySelector('.net-person-chosen')?.textContent).toContain('rsoto')
  }, 20_000)
})
