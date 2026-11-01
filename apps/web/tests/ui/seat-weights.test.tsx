/**
 * Panel, pestaña Amigos: los pesos de los puestos (`SeatWeightsPanel.tsx`,
 * `docs/asientos.md`). Se eligen casillas, se les da un peso (con su pareja y
 * su espejo), se ve cómo quedaría y se guarda.
 */

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SeatWeightsPanel } from '../../src/features/network/SeatWeightsPanel'
import { api } from '../../src/shared/api'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'

const WAIT = { timeout: 5000 }
const text = (key: string): string => must(es[key], `el texto ${key}`)
const fill = (key: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (line, [name, value]) => line.replace(`{${name}}`, String(value)),
    text(key),
  )
const cell = (row: number, side: string, weight: string): HTMLElement =>
  screen.getByRole('button', {
    name: fill('admin.seats.cell', { row: text(`admin.seats.row.${String(row)}`), side, weight }),
  })
const right = (n: number): string => fill('admin.seats.right', { n })
const left = (n: number): string => fill('admin.seats.left', { n })

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('pesos de los puestos en el panel', () => {
  it('se elige una casilla, arrastra a su pareja y su espejo, se prueba y se guarda', async () => {
    const user = userEvent.setup()
    const saved = vi.spyOn(api, 'saveSeatWeights')
    const tried = vi.spyOn(api, 'previewSeatWeights')

    localStorage.setItem('sanatorio_lang', 'es')
    render(
      <I18nProvider>
        <SeatWeightsPanel />
      </I18nProvider>,
    )

    // Los de siempre: al lado 3, enfrente 2, la fila de atrás 1,5.
    await screen.findByRole('group', { name: text('admin.seats.title') }, WAIT)
    expect(cell(1, left(2), '3')).toBeTruthy()
    expect(cell(1, right(1), '2')).toBeTruthy()
    expect(cell(2, right(1), '1,5')).toBeTruthy()
    expect(screen.getByRole('button', { name: text('admin.seats.save') })).toHaveProperty(
      'disabled',
      true,
    )

    // 2 a la derecha en la fila de delante: con pareja y espejo, cambian cuatro casillas.
    await user.click(cell(0, right(2), '0'))
    expect(screen.getByRole('button', { name: fill('admin.seats.apply', { n: 4 }) })).toBeTruthy()

    const weight = screen.getByLabelText(text('admin.seats.weight'))

    await user.clear(weight)
    await user.type(weight, '2.5')
    await user.click(screen.getByRole('button', { name: fill('admin.seats.apply', { n: 4 }) }))
    for (const [row, side] of [
      [0, right(2)],
      [0, left(2)],
      [2, right(2)],
      [2, left(2)],
    ] as const) {
      expect(cell(row, side, '2,5')).toBeTruthy()
    }

    await user.click(screen.getByRole('button', { name: text('admin.seats.preview') }))
    expect(await screen.findByText(text('admin.seats.compare'), {}, WAIT)).toBeTruthy()
    expect(tried).toHaveBeenCalledWith(
      [
        [0, 2.5, 0, 0, 0, 2.5, 0],
        [0, 3, 2, 0, 2, 3, 0],
        [0, 2.5, 1.5, 0, 1.5, 2.5, 0],
      ],
      3650,
    )
    expect(screen.getByText(text('admin.seats.q.modularity'))).toBeTruthy()

    await user.click(screen.getByRole('button', { name: text('admin.seats.save') }))
    expect(await screen.findByText(text('admin.seats.saved'), {}, WAIT)).toBeTruthy()
    expect(saved).toHaveBeenCalledOnce()

    // Volver a los de siempre deja la cuadrícula como al principio.
    await user.click(screen.getByRole('button', { name: text('admin.seats.defaults') }))
    expect(cell(0, right(2), '0')).toBeTruthy()
  }, 20_000)
})
