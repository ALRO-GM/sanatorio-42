import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CAMPUS_WAIT_MS, CampusPicker } from '../../src/features/network/CampusPicker'
import { I18nProvider } from '../../src/shared/i18n'

const CAMPUSES = [
  { id: 22, name: 'Madrid' },
  { id: 1, name: 'Paris' },
  { id: 46, name: 'Barcelona' },
]

function setup(current: number[] = [22]) {
  const onApply = vi.fn()

  render(
    <I18nProvider>
      <CampusPicker available={CAMPUSES} current={current} onApply={onApply} />
    </I18nProvider>,
  )

  const pill = (name: string): HTMLElement => screen.getByRole('button', { name })

  return { onApply, pill }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('elegir escuelas de la red', () => {
  it('cada clic marca y reinicia la espera; al acabar se pide con todo lo marcado', () => {
    const { onApply, pill } = setup()

    fireEvent.click(pill('Paris'))
    expect(pill('Paris').getAttribute('aria-pressed')).toBe('true')
    act(() => {
      vi.advanceTimersByTime(CAMPUS_WAIT_MS - 100)
    })
    expect(onApply).not.toHaveBeenCalled()

    // Otra antes de que acabe: el reloj vuelve a empezar.
    fireEvent.click(pill('Barcelona'))
    act(() => {
      vi.advanceTimersByTime(CAMPUS_WAIT_MS - 100)
    })
    expect(onApply).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(onApply).toHaveBeenCalledOnce()
    expect(onApply).toHaveBeenCalledWith([22, 1, 46])
  })

  it('otro clic en la misma la desmarca, y sin ninguna no se pide nada', () => {
    const { onApply, pill } = setup()

    fireEvent.click(pill('Madrid'))
    expect(pill('Madrid').getAttribute('aria-pressed')).toBe('false')
    act(() => {
      vi.advanceTimersByTime(CAMPUS_WAIT_MS * 2)
    })
    expect(onApply).not.toHaveBeenCalled()
  })

  it('doble clic: solo esa, al momento', () => {
    const { onApply, pill } = setup([22, 46])

    fireEvent.click(pill('Paris'))
    fireEvent.click(pill('Paris'))
    fireEvent.doubleClick(pill('Paris'))
    expect(onApply).toHaveBeenCalledWith([1])
    act(() => {
      vi.advanceTimersByTime(CAMPUS_WAIT_MS * 2)
    })
    expect(onApply).toHaveBeenCalledOnce()
  })
})
