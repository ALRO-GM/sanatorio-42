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

describe('Tablón de dudas', () => {
  it('se cuelga una duda, se responde y quien la pidió la da por resuelta', async () => {
    const user = userEvent.setup()

    await openApp('#/tablon')

    await user.click(
      await screen.findByRole('button', { name: text('board.newDoubt') }, { timeout: 5000 }),
    )
    // Menos de cinco caracteres no es una duda.
    const box = screen.getByRole('textbox', { name: text('board.newDoubt') })
    const post = screen.getByRole('button', { name: text('board.post') })

    await user.type(box, 'abc')
    expect(post).toHaveProperty('disabled', true)
    await user.type(box, ' ¿por qué mi printf no imprime nada sin \\n?')
    await user.click(post)

    const postit = await screen.findByRole('button', {
      name: /abc ¿por qué mi printf no imprime nada/,
    })

    await user.click(postit)

    const answer = await screen.findByRole('textbox', { name: text('board.answerHint') })

    await user.type(answer, 'Porque stdout va con búfer de línea: haz fflush.')
    await user.click(screen.getByRole('button', { name: text('board.answer') }))

    const solve = await screen.findByRole('button', { name: text('board.solvedByThis') })

    await user.click(solve)

    expect(await screen.findByText(text('board.solution'))).toBeTruthy()
    const solved = must(
      screen.getByText('Porque stdout va con búfer de línea: haz fflush.').closest('li'),
      'la respuesta',
    )

    expect(solved.className).toContain('solution')
    expect(within(solved).queryByRole('button', { name: text('board.solvedByThis') })).toBeNull()
  }, 20_000)
})
