import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)
const escape = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('El secreto de la cruz y Code Clicker', () => {
  it('a las 42 llamadas sale la ventana de las pastillas; la roja abre el juego', async () => {
    const user = userEvent.setup()

    // Sin animación: el mensaje sale entero y las pastillas se pueden pulsar ya.
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('reduce'),
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }) as unknown as MediaQueryList,
    )
    await openApp('#/expediente')

    const cross = await screen.findByRole('button', { name: text('nav.openRecord') })

    // Hasta que no sabe por dónde ibas (lo pregunta al abrir), la cruz no cuenta.
    await new Promise((resolve) => setTimeout(resolve, 1500))

    for (let knock = 0; knock < 41; knock += 1) await user.click(cross)
    // A las 41 aún no pasa nada.
    expect(screen.queryByText(text('egg.title'))).toBeNull()
    await user.click(cross)

    expect(await screen.findByText(text('egg.title'), {}, { timeout: 5000 })).toBeTruthy()

    const red = screen.getByRole('button', { name: new RegExp(escape(text('egg.red'))) })

    await waitFor(() => {
      expect(red).toHaveProperty('disabled', false)
    })
    await user.click(red)

    await waitFor(
      () => {
        expect(window.location.hash).toBe('#/clicker')
      },
      { timeout: 5000 },
    )
    expect(screen.queryByText(text('egg.title'))).toBeNull()
  }, 30_000)
})
