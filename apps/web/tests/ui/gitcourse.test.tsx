import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
})

describe('curso de git', () => {
  it('el camino abre en orden: animación, teoría y reto con la terminal', async () => {
    const user = userEvent.setup()

    await openApp('#/notgames/git')

    // Solo el primer punto está abierto.
    const first = await screen.findByRole('button', { name: 'Tu primer commit' })

    expect(
      screen.getByRole('button', { name: 'El índice: git add' }).getAttribute('aria-disabled'),
    ).toBe('true')
    await user.click(first)
    expect(await screen.findByText(text('git.anim.start'))).toBeTruthy()
    await user.click(screen.getByRole('button', { name: text('git.toTheory') }))
    expect(screen.getByText(text('git.theory.what'))).toBeTruthy()
    await user.click(screen.getByRole('button', { name: text('git.toChallenge') }))

    // Un comando que no existe da error y no cambia nada; dos commits llegan al objetivo.
    const input = screen.getByRole('textbox', { name: text('git.term.input') })

    await user.type(input, 'git comit{Enter}')
    expect(screen.getByText(/no lo conozco/)).toBeTruthy()
    await user.type(input, 'git commit -m uno{Enter}git commit -m dos{Enter}')
    expect(await screen.findByText(new RegExp(text('git.won')))).toBeTruthy()

    // De vuelta en el camino, el segundo punto ya se puede abrir.
    await user.click(screen.getByRole('button', { name: new RegExp(text('git.back')) }))
    expect(
      (await screen.findByRole('button', { name: 'El índice: git add' })).getAttribute(
        'aria-disabled',
      ),
    ).toBe('false')
  }, 20_000)
})
