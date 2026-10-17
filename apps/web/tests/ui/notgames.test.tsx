import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
})

describe('Not-games', () => {
  it('se crea una sala, se juega una pregunta y se ve la respuesta con su porqué', async () => {
    const user = userEvent.setup()

    await openApp('#/notgames')
    await user.click(
      await screen.findByRole('button', { name: new RegExp(text('notgames.create')) }),
    )
    await user.click(screen.getByRole('button', { name: new RegExp(text('notgames.mode.ffa')) }))
    await user.click(screen.getByRole('button', { name: text('notgames.createSend') }))

    // Dentro de la sala, con la gente que espera.
    await waitFor(() => {
      expect(window.location.hash).toMatch(/^#\/notgames\/\d+$/)
    })
    await user.click(
      await screen.findByRole(
        'button',
        { name: new RegExp(text('notgames.start')) },
        { timeout: 5000 },
      ),
    )

    // Pasa la cuenta atrás y sale la pregunta con sus cuatro respuestas.
    const card = await screen.findByText(/Pregunta 1 de/, {}, { timeout: 8000 })
    const question = must(card.closest('article'), 'la pregunta')
    const options = await within(question).findAllByRole('button', {}, { timeout: 8000 })

    expect(options).toHaveLength(4)
    await user.click(must(options[0], 'una respuesta'))

    // Al cerrarse, se ve si acertó y el porqué.
    expect(
      await within(question).findByText(
        new RegExp(`${text('notgames.right')}|${text('notgames.wrong')}`),
        {},
        { timeout: 12000 },
      ),
    ).toBeTruthy()
    expect(screen.getByText(text('notgames.scores'))).toBeTruthy()
  }, 40_000)

  it('cada modo explica en qué consiste', async () => {
    const user = userEvent.setup()

    await openApp('#/notgames')
    await user.click(
      await screen.findByRole('button', { name: new RegExp(text('notgames.create')) }),
    )
    for (const mode of ['duel', 'teams', 'ffa', 'survival']) {
      expect(screen.getByText(text(`notgames.mode.${mode}.hint`))).toBeTruthy()
    }
    // En supervivencia no hay versión competitiva: ahí se pierden vidas.
    await user.click(
      screen.getByRole('button', { name: new RegExp(text('notgames.mode.survival')) }),
    )
    expect(screen.queryByText(text('notgames.competitive'))).toBeNull()
  }, 20_000)
})
