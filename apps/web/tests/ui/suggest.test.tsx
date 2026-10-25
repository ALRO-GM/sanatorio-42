/**
 * La burbuja de sugerencias de la cabecera (`docs/sugerencias.md`), como la
 * usaría una persona: con el teclado (abrir, elegir la sección, escribir y
 * mandar) y arrastrándola hasta un bloque, que se detecta solo. Después de
 * mandar, la burbuja vuelve a su sitio.
 */

import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../src/shared/api'
import { must } from './must'
import { openApp } from './render'

const WAIT = { timeout: 5000 }
const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const bubble = (): Promise<HTMLElement> =>
  screen.findByRole('button', { name: text('suggest.open') }, WAIT)

describe('burbuja de sugerencias', () => {
  it('con el teclado: se abre, se elige la sección, se escribe, se manda y vuelve', async () => {
    const user = userEvent.setup()

    await openApp('#/consulta')

    const button = await bubble()

    button.focus()
    await user.keyboard('{Enter}')

    const panel = await screen.findByRole('dialog', { name: text('suggest.open') }, WAIT)

    expect(button.getAttribute('aria-expanded')).toBe('true')
    // Sin arrastrar no hay nada detectado: la lista de secciones sale abierta.
    const section = within(panel).getByRole('combobox', { name: text('suggest.section') })

    expect(document.activeElement).toBe(section)
    await user.selectOptions(section, text('nav.tablon'))
    await user.type(
      within(panel).getByRole('textbox', { name: text('suggest.problem') }),
      'No encuentro las dudas de un proyecto',
    )
    await user.type(
      within(panel).getByRole('textbox', { name: text('suggest.proposal') }),
      'Un enlace bajo cada círculo',
    )
    await user.click(within(panel).getByRole('button', { name: text('common.send') }))

    expect(await screen.findByText(text('suggest.thanks'), {}, WAIT)).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: text('suggest.open') })).toBeNull()
    // De vuelta en la cabecera, con el foco.
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(button.classList.contains('away')).toBe(false)
    expect(document.activeElement).toBe(button)

    const sent = (await api.getMyTickets())[0]

    expect(sent?.proposal).toBe('Un enlace bajo cada círculo')
    expect(sent?.place).toMatchObject({
      section: 'tablon',
      label: text('nav.tablon'),
      selector: '',
      lang: 'es',
    })
  }, 20_000)

  it('arrastrándola sobre un bloque, lo detecta y Escape lo cierra', async () => {
    // jsdom no trae `PointerEvent`: sin él, los eventos llegan sin botón ni coordenadas.
    if (!('PointerEvent' in window)) {
      class PointerEventLike extends MouseEvent {
        pointerId: number

        constructor(type: string, init: PointerEventInit = {}) {
          super(type, init)
          this.pointerId = init.pointerId ?? 0
        }
      }

      vi.stubGlobal('PointerEvent', PointerEventLike)
    }
    await openApp('#/expediente')

    const button = await bubble()
    const block = await waitFor(() =>
      must(document.querySelector('[data-feedback="expediente.health"]'), 'el bloque de salud'),
    )
    const inside = block.querySelector('.block-head') ?? block

    // jsdom no sabe qué hay en cada punto: se le dice que debajo está el bloque.
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: () => inside,
    })

    await act(async () => {
      fireEvent.pointerDown(button, { button: 0, pointerId: 1, clientX: 10, clientY: 10 })
      fireEvent.pointerMove(button, { pointerId: 1, clientX: 200, clientY: 300 })
      await Promise.resolve()
    })
    // Mientras se arrastra, el marco dice qué se va a señalar.
    expect(document.querySelector('.suggest-outline')?.textContent).toBe(
      text('layout.expediente.health'),
    )

    await act(async () => {
      fireEvent.pointerUp(button, { pointerId: 1, clientX: 200, clientY: 300 })
      fireEvent.click(button)
      await Promise.resolve()
    })

    const panel = await screen.findByRole('dialog', { name: text('suggest.open') }, WAIT)

    expect(within(panel).getByText(text('layout.expediente.health'))).toBeTruthy()
    // Lo detectado se puede cambiar, pero no hace falta: la lista sale plegada.
    expect(within(panel).queryByRole('combobox')).toBeNull()
    expect(within(panel).getByRole('button', { name: text('suggest.change') })).toBeTruthy()

    fireEvent.keyDown(within(panel).getByRole('textbox', { name: text('suggest.problem') }), {
      key: 'Escape',
    })
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: text('suggest.open') })).toBeNull()
    }, WAIT)
    await waitFor(() => {
      expect(button.classList.contains('away')).toBe(false)
    }, WAIT)
    Reflect.deleteProperty(document, 'elementFromPoint')
  }, 20_000)
})
