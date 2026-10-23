import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePolling } from '../../src/shared/hooks/usePolling'

function Poller({ fn, every }: { fn: () => void; every: number | null }) {
  usePolling(fn, every)

  return null
}

/** Finge la pestaña oculta o visible, que es lo que mira el sondeo. */
function hide(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true })
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  hide(false)
  vi.useRealTimers()
})

describe('usePolling: pedir de nuevo mientras se mira', () => {
  it('llama cada vuelta, con la función más reciente, y se para al desmontar', () => {
    const first = vi.fn()
    const second = vi.fn()
    const view = render(<Poller fn={first} every={1000} />)

    vi.advanceTimersByTime(2000)
    expect(first).toHaveBeenCalledTimes(2)

    // Cambiar de función no reinicia la cuenta: la siguiente vuelta usa la nueva.
    view.rerender(<Poller fn={second} every={1000} />)
    vi.advanceTimersByTime(1000)
    expect(first).toHaveBeenCalledTimes(2)
    expect(second).toHaveBeenCalledTimes(1)

    view.unmount()
    vi.advanceTimersByTime(5000)
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('con la pestaña oculta no pide nada, y con null tampoco', () => {
    const fn = vi.fn()
    const view = render(<Poller fn={fn} every={500} />)

    hide(true)
    vi.advanceTimersByTime(2000)
    expect(fn).not.toHaveBeenCalled()

    hide(false)
    vi.advanceTimersByTime(500)
    expect(fn).toHaveBeenCalledTimes(1)

    view.rerender(<Poller fn={fn} every={null} />)
    vi.advanceTimersByTime(5000)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
