/**
 * La red de asientos se recorta para leerse (`docs/asientos.md`): las más
 * cercanas de cada cual, hasta una parte de su tiempo acompañado y, al elegir
 * a alguien, solo sus conexiones. Contra la API de mentira.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import es from 'virtual:textos/es'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { SeatsPage } from '../../src/features/network/SeatsPage'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'

const text = (key: string): string => must(es[key], `el texto ${key}`)

/** Personas y uniones que dice el grafo, sacadas de su nombre accesible. */
function graphCounts(): { people: number; links: number } {
  const label = document.querySelector('canvas.force-graph')?.getAttribute('aria-label') ?? ''
  const [people = '0', links = '0'] = label.match(/\d+/g) ?? []

  return { people: Number(people), links: Number(links) }
}

beforeEach(() => {
  localStorage.setItem('sanatorio_lang', 'es')
})

afterEach(() => {
  cleanup()
})

describe('red de asientos: recortar el grafo', () => {
  it('de cada cual, sus más cercanas; y al elegir a alguien, solo sus conexiones', async () => {
    render(
      <I18nProvider>
        <SeatsPage switcher={null} />
      </I18nProvider>,
    )

    const most = await screen.findByRole('combobox', { name: text('seats.trim.most') })

    await waitFor(() => {
      expect(graphCounts().people).toBeGreaterThan(0)
    })

    // Todas y todo el tiempo: el grafo entero.
    fireEvent.change(most, { target: { value: 'all' } })
    fireEvent.change(screen.getByRole('combobox', { name: text('seats.trim.share') }), {
      target: { value: '1' },
    })

    const whole = graphCounts()

    expect(screen.queryByRole('status')).toBeNull()

    // Una por persona: menos uniones, la misma gente, y se dice cuántas se ven.
    fireEvent.change(most, { target: { value: '1' } })

    const one = graphCounts()

    expect(one.people).toBe(whole.people)
    expect(one.links).toBeLessThan(whole.links)
    expect(screen.getByRole('status').textContent).toContain(String(one.links))

    // Elegida una persona en el buscador: ella y sus tres más cercanas.
    fireEvent.change(most, { target: { value: '3' } })

    const search = screen.getByRole('combobox', { name: text('common.person') })
    const someone = document.querySelector<HTMLOptionElement>('#seats-people option')?.value ?? ''

    fireEvent.change(search, { target: { value: someone } })

    await waitFor(() => {
      expect(graphCounts().people).toBeLessThanOrEqual(4)
    })
    expect(graphCounts().links).toBe(graphCounts().people - 1)

    // Sin la casilla, vuelve el grafo de todos.
    fireEvent.click(screen.getByRole('checkbox', { name: text('seats.trim.focus') }))

    expect(graphCounts().people).toBe(whole.people)

    // Al vaciar el buscador, nadie elegido.
    fireEvent.click(screen.getByRole('checkbox', { name: text('seats.trim.focus') }))
    fireEvent.change(search, { target: { value: '' } })

    expect(graphCounts().people).toBe(whole.people)
  })
})
