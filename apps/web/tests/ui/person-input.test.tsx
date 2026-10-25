import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
})

describe('Hueco de login con perfiles sugeridos', () => {
  it('al escribir salen los perfiles, y con las flechas y Enter se elige uno', async () => {
    const user = userEvent.setup()

    await openApp('#/avance')

    const box = await screen.findByRole(
      'combobox',
      { name: text('stats.progress.compare') },
      { timeout: 5000 },
    )

    await user.type(box, 'jd')

    // La lista, con la foto, el login y el nombre de cada cual.
    const list = await screen.findByRole('listbox', { name: text('stats.progress.compare') })

    expect(within(list).getByText('jdoe')).toBeTruthy()
    expect(within(list).getByText('Jane Doe')).toBeTruthy()

    await user.keyboard('{ArrowDown}{ArrowUp}{Enter}')

    // Elegido: se añade a la gráfica (su pastilla, para quitarla), el hueco se
    // vacía para el siguiente y la lista se cierra.
    expect(await screen.findByRole('button', { name: 'Quitar a jdoe' })).toBeTruthy()
    expect(box).toHaveProperty('value', '')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(await screen.findAllByText('jdoe')).not.toHaveLength(0)
  }, 20_000)
})
