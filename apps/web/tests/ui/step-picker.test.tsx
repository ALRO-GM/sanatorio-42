/**
 * El selector de periodo de toda la web (`shared/ui/StepPicker`): un `<select>`
 * nativo en escritorio y una rueda en el móvil, con teclado y deslizando. Y
 * dónde se usa: la Red (con su periodo «a mano»).
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { StepPicker, WHEEL_QUERY } from '../../src/shared/ui/StepPicker'
import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)
const OPTIONS = ['8', '12', '24', 'all'] as const

/** Un selector con su estado, como en cualquier pantalla. */
function Picker({ variant = 'auto' }: { variant?: 'auto' | 'select' | 'wheel' }) {
  const [value, setValue] = useState<(typeof OPTIONS)[number]>('12')

  return (
    <StepPicker
      options={OPTIONS}
      value={value}
      onChange={setValue}
      label="Periodo"
      text={(option) => (option === 'all' ? 'Todo' : `${option} m`)}
      variant={variant}
    />
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('StepPicker', () => {
  it('en escritorio, un desplegable nativo con su rótulo', async () => {
    const user = userEvent.setup()

    render(<Picker />)
    const select = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Periodo' })

    expect(select.value).toBe('12')
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['8 m', '12 m', '24 m', 'Todo'])
    await user.selectOptions(select, 'Todo')
    expect(select.value).toBe('all')
  })

  it('en el móvil, una rueda: las flechas, Inicio y Fin la mueven', async () => {
    const user = userEvent.setup()

    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          matches: query === WHEEL_QUERY,
          media: query,
          onchange: null,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          addListener: () => undefined,
          removeListener: () => undefined,
          dispatchEvent: () => false,
        }) as MediaQueryList,
    )
    render(<Picker />)
    const wheel = screen.getByRole('spinbutton', { name: 'Periodo' })

    expect(wheel.getAttribute('aria-valuetext')).toBe('12 m')
    wheel.focus()
    await user.keyboard('{ArrowUp}')
    expect(wheel.getAttribute('aria-valuetext')).toBe('24 m')
    await user.keyboard('{End}')
    expect(wheel.getAttribute('aria-valuetext')).toBe('Todo')
    // Más allá del final no pasa nada.
    await user.keyboard('{ArrowUp}')
    expect(wheel.getAttribute('aria-valuenow')).toBe('3')
    await user.keyboard('{Home}{ArrowDown}')
    expect(wheel.getAttribute('aria-valuetext')).toBe('8 m')
  })

  it('la rueda se desliza con el dedo y se toca la opción de al lado', () => {
    render(<Picker variant="wheel" />)
    const wheel = screen.getByRole('spinbutton', { name: 'Periodo' })

    // Hacia arriba dos filas (32 px cada una): dos opciones más.
    fireEvent.pointerDown(wheel, { clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(wheel, { clientY: 70, pointerId: 1 })
    expect(wheel.classList.contains('dragging')).toBe(true)
    fireEvent.pointerUp(wheel, { clientY: 36, pointerId: 1 })
    expect(wheel.getAttribute('aria-valuetext')).toBe('Todo')
    expect(wheel.classList.contains('dragging')).toBe(false)

    // Un toque, sin arrastrar, en la primera opción.
    const first = must(wheel.querySelector('[data-step="0"]'), 'la primera opción')

    fireEvent.pointerDown(first, { clientY: 10, pointerId: 2 })
    fireEvent.pointerUp(first, { clientY: 10, pointerId: 2 })
    expect(wheel.getAttribute('aria-valuetext')).toBe('8 m')
  })

  it('en la Red: el periodo se elige en el desplegable y «a mano» abre las fechas', async () => {
    const user = userEvent.setup()

    await openApp('#/red')
    const select = await screen.findByRole<HTMLSelectElement>(
      'combobox',
      { name: text('common.period') },
      { timeout: 5000 },
    )

    // De menos a más y, al final, a mano.
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(
      ['month', 'quarter', 'year', 'all', 'custom'].map((period) => text(`net.period.${period}`)),
    )
    await user.selectOptions(select, text('net.period.custom'))
    expect(screen.getByLabelText(text('common.from'))).toBeTruthy()
  })
})
