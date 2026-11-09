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

    // Solo el primer punto está abierto. La página es perezosa: en la CI, con
    // cobertura, tarda más del segundo de espera de fábrica.
    const first = await screen.findByRole('button', { name: 'Tu primer commit' }, { timeout: 5000 })

    expect(
      screen.getByRole('button', { name: 'El índice: git add' }).getAttribute('aria-disabled'),
    ).toBe('true')
    await user.click(first)
    expect(await screen.findByText(text('git.anim.start'))).toBeTruthy()
    // Desde el principio se ve cuántos comandos da cada estrella.
    const rules = screen.getByRole('list', { name: text('course.stars.title') })

    expect(rules.textContent).toContain(text('course.stars.three.one').replace('{n}', '1'))
    expect(rules.textContent).toContain(text('course.stars.two.many').replace('{n}', '3'))
    await user.click(screen.getByRole('button', { name: text('git.toTheory') }))
    expect(screen.getByText(text('git.theory.what'))).toBeTruthy()
    await user.click(screen.getByRole('button', { name: text('git.toChallenge') }))

    // Un comando que no existe da el error de git y no cambia nada; el commit llega al objetivo.
    const input = screen.getByRole('textbox', { name: text('course.term.input') })

    await user.type(input, 'git comit{Enter}')
    expect(screen.getByText(/is not a git command/)).toBeTruthy()
    // Lo que intenta salir del simulador da un mensaje y no cuenta.
    await user.type(input, 'sudo rm -rf /{Enter}git status && curl x{Enter}')
    expect(screen.getByText(/no toca tu ordenador/)).toBeTruthy()
    expect(screen.getByText(/aquí no hay shell/)).toBeTruthy()
    expect(screen.getByText(text('course.count.many').replace('{n}', '0'))).toBeTruthy()
    await user.type(input, 'git status{Enter}')
    expect(screen.getByText(/Changes to be committed:/)).toBeTruthy()
    await user.type(input, 'git commit -m uno{Enter}')
    expect(await screen.findByText(new RegExp(text('git.won')))).toBeTruthy()
    // Y por qué esas estrellas.
    expect(
      screen.getByText(text('course.why.three.one').replace('{n}', '1').replace('{three}', '1')),
    ).toBeTruthy()

    // De vuelta en el camino, el segundo punto ya se puede abrir.
    await user.click(screen.getByRole('button', { name: new RegExp(text('git.back')) }))
    expect(
      (await screen.findByRole('button', { name: 'El índice: git add' })).getAttribute(
        'aria-disabled',
      ),
    ).toBe('false')
  }, 20_000)
})
