import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useNow } from '../../src/shared/hooks/useNow'

/** Un reloj en pantalla, como los de las salas y el Pomodoro. */
function Clock({
  every,
  active = true,
  offset = 0,
}: {
  every: number
  active?: boolean
  offset?: number
}) {
  const now = useNow(every, { active, offset })

  return <output>{now}</output>
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useNow: un reloj compartido', () => {
  it('se pone al día con la cadencia pedida, y el servidor adelantado se suma', () => {
    render(
      <>
        <Clock every={1000} />
        <Clock every={1000} offset={500} />
      </>,
    )

    const [plain, ahead] = screen.getAllByRole('status')

    expect(plain?.textContent).toBe('1000000')
    expect(ahead?.textContent).toBe('1000500')

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(plain?.textContent).toBe('1001000')
    expect(ahead?.textContent).toBe('1001500')
  })

  it('varios relojes con la misma cadencia comparten un solo intervalo', () => {
    const setInterval = vi.spyOn(window, 'setInterval')

    render(
      <>
        <Clock every={200} />
        <Clock every={200} />
        <Clock every={200} />
      </>,
    )

    expect(setInterval).toHaveBeenCalledTimes(1)
  })

  it('parado no cambia, y al desmontar el último se suelta el intervalo', () => {
    const clearInterval = vi.spyOn(window, 'clearInterval')
    const view = render(<Clock every={100} active={false} />)
    const before = screen.getByRole('status').textContent

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByRole('status').textContent).toBe(before)

    view.rerender(<Clock every={100} />)
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(Number(screen.getByRole('status').textContent)).toBeGreaterThan(Number(before))

    view.unmount()
    expect(clearInterval).toHaveBeenCalled()
  })
})
