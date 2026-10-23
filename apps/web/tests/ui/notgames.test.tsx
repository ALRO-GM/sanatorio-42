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
    // La página carga salas y textos a la vez: en la CI tarda más del segundo por defecto.
    await user.click(
      await screen.findByRole(
        'button',
        { name: new RegExp(text('common.createRoom')) },
        { timeout: 5000 },
      ),
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

    // Se puede salir en plena partida: vuelve a la lista y la sala, sin nadie, ya no está.
    await user.click(screen.getByRole('button', { name: new RegExp(text('common.leave')) }))
    await waitFor(() => {
      expect(window.location.hash).toBe('#/notgames')
    })
    expect(await screen.findByText(text('notgames.noRooms'))).toBeTruthy()
  }, 40_000)

  it('cada modo explica en qué consiste', async () => {
    const user = userEvent.setup()

    await openApp('#/notgames')
    await user.click(
      await screen.findByRole('button', { name: new RegExp(text('common.createRoom')) }),
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

  it('ajedrez: se mueve, sale la pregunta a los dos y quien acierta vuelve a mover', async () => {
    const user = userEvent.setup()

    await openApp('#/notgames')
    await user.click(
      await screen.findByRole('button', { name: new RegExp(text('common.createRoom')) }),
    )
    await user.click(
      screen.getByRole('button', { name: new RegExp(`^${text('notgames.game.chess')}`) }),
    )
    await user.click(screen.getByRole('button', { name: text('notgames.createSend') }))
    await waitFor(() => {
      expect(window.location.hash).toMatch(/^#\/notgames\/t\d+$/)
    })
    await user.click(
      await screen.findByRole(
        'button',
        { name: new RegExp(text('notgames.start')) },
        { timeout: 5000 },
      ),
    )

    const board = await screen.findByRole('grid', { name: text('notgames.chess.board') })
    const square = (name: string): HTMLElement =>
      within(board).getByRole('gridcell', { name: new RegExp(`^${name}`) })

    expect(await screen.findByText(text('notgames.chess.yourMove'))).toBeTruthy()
    // Al pulsar el peón se marcan sus dos casillas; se mueve a e4.
    await user.click(square('e2'))
    expect(board.querySelectorAll('.chess-square.target')).toHaveLength(2)
    await user.click(square('e4'))

    // Relojes parados y la pregunta encima del tablero.
    expect(await screen.findByText(text('notgames.chess.question'))).toBeTruthy()
    const question = must(
      (await screen.findByText(text('notgames.chess.questionTitle'))).closest('article'),
      'la pregunta',
    )
    const options = within(question).getAllByRole('button')

    expect(options).toHaveLength(4)
    // La de ejemplo: «¿Cuántos bits tiene un byte?» → 8.
    await user.click(within(question).getByRole('button', { name: '8' }))

    expect(await screen.findByText(text('notgames.chess.firstRightMe'))).toBeTruthy()
    expect(await screen.findByText(text('notgames.chess.yourMove'))).toBeTruthy()
    await user.click(square('d2'))
    await user.click(square('d4'))
    expect(
      await screen.findByText(
        new RegExp(text('notgames.chess.moves').replace('{n}', '2').replace(/[()]/g, '\\$&')),
      ),
    ).toBeTruthy()

    // Abandonar acaba la partida.
    await user.click(
      screen.getByRole('button', { name: new RegExp(text('notgames.chess.resign')) }),
    )
    expect(await screen.findByText(new RegExp(text('notgames.end.resign')))).toBeTruthy()
  }, 40_000)

  it('el Repaso enseña lo que fallaste con su definición y ejemplo, y aparte lo superado', async () => {
    const user = userEvent.setup()

    await openApp('#/notgames')
    await user.click(await screen.findByRole('tab', { name: text('notgames.tab.review') }))

    const card = must(
      (await screen.findByRole('heading', { name: 'Punteros colgantes' })).closest('article'),
      'la tarjeta',
    )

    expect(within(card).getByText(text('notgames.review.example'))).toBeTruthy()
    expect(within(card).getByText(/malloc\(sizeof\(int\)\)/)).toBeTruthy()
    // Lo superado no se ve hasta desplegarlo.
    expect(screen.queryByRole('heading', { name: 'El índice (git add)' })).toBeNull()
    await user.click(screen.getByRole('button', { name: /\(1\)/ }))
    expect(await screen.findByRole('heading', { name: 'El índice (git add)' })).toBeTruthy()
  }, 20_000)
})
