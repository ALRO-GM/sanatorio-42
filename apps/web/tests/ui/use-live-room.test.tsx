import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useLiveRoom } from '../../src/shared/hooks/useLiveRoom'

type Room = { id: number; now: string; status: 'lobby' | 'playing' | 'done' }

const PLAYING_MS = 1000
const WAITING_MS = 2500

/** Una sala con la hora del servidor `ahead` milisegundos por delante de la de aquí. */
const room = (status: Room['status'], ahead = 0, id = 1): Room => ({
  id,
  status,
  now: new Date(Date.now() + ahead).toISOString(),
})

/** Deja que se resuelvan las promesas pendientes (la carga) con el reloj de mentira. */
async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

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

describe('useLiveRoom: una sala que lleva el servidor', () => {
  it('se pide al entrar, guarda la diferencia de reloj y avisa de cada cambio', async () => {
    const fetch = vi.fn(() => Promise.resolve(room('lobby', 5000)))
    const onChange = vi.fn()
    const { result } = renderHook(() =>
      useLiveRoom(fetch, [1], { playingMs: PLAYING_MS, waitingMs: WAITING_MS, onChange }),
    )

    expect(result.current.room).toBeNull()
    await settle()
    expect(fetch).toHaveBeenCalledOnce()
    expect(result.current.room?.status).toBe('lobby')
    expect(Math.abs(result.current.offset.current - 5000)).toBeLessThan(50)
    expect(onChange).toHaveBeenCalledWith(null, result.current.room)
  })

  it('despacio esperando, deprisa jugando y nada al acabar', async () => {
    let status: Room['status'] = 'lobby'
    const fetch = vi.fn(() => Promise.resolve(room(status)))
    const { result } = renderHook(() =>
      useLiveRoom(fetch, [1], { playingMs: PLAYING_MS, waitingMs: WAITING_MS }),
    )

    await settle()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WAITING_MS)
    })
    expect(fetch).toHaveBeenCalledTimes(2)

    // Una acción (empezar) devuelve la sala jugando: se pone sin esperar.
    status = 'playing'
    act(() => {
      result.current.take(room('playing'))
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PLAYING_MS * 3)
    })
    expect(fetch).toHaveBeenCalledTimes(5)

    status = 'done'
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PLAYING_MS)
    })
    expect(result.current.room?.status).toBe('done')

    const calls = fetch.mock.calls.length

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(fetch).toHaveBeenCalledTimes(calls)
  })

  it('si falla, lo dice sin perder la sala de antes y se puede reintentar', async () => {
    const fetch = vi
      .fn<() => Promise<Room>>()
      .mockRejectedValueOnce(new Error('sin red'))
      .mockResolvedValue(room('lobby'))
    const { result } = renderHook(() =>
      useLiveRoom(fetch, [1], { playingMs: PLAYING_MS, waitingMs: WAITING_MS }),
    )

    await settle()
    expect(result.current.room).toBeNull()
    expect(result.current.error).toBeInstanceOf(Error)

    await act(async () => {
      await result.current.load()
    })
    expect(result.current.error).toBeNull()
    expect(result.current.room?.status).toBe('lobby')

    // Un fallo con la sala ya cargada no la borra.
    fetch.mockRejectedValueOnce(new Error('otra vez'))
    await act(async () => {
      await result.current.load()
    })
    expect(result.current.room?.status).toBe('lobby')
    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('con la pestaña oculta no pregunta, y otra sala se pide de nuevo', async () => {
    const fetch = vi.fn((id: number) => Promise.resolve(room('lobby', 0, id)))
    const { result, rerender } = renderHook(
      ({ id }) =>
        useLiveRoom(() => fetch(id), [id], { playingMs: PLAYING_MS, waitingMs: WAITING_MS }),
      { initialProps: { id: 1 } },
    )

    await settle()
    hide(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WAITING_MS * 4)
    })
    expect(fetch).toHaveBeenCalledTimes(1)

    rerender({ id: 2 })
    await settle()
    expect(fetch).toHaveBeenLastCalledWith(2)
    expect(result.current.room?.id).toBe(2)
  })

  it('cambiar el aviso de cambios no vuelve a pedir la sala', async () => {
    const fetch = vi.fn(() => Promise.resolve(room('lobby')))
    type Props = { onChange: (previous: Room | null, next: Room) => void }
    const { rerender } = renderHook(
      ({ onChange }: Props) =>
        useLiveRoom(fetch, [1], { playingMs: PLAYING_MS, waitingMs: WAITING_MS, onChange }),
      { initialProps: { onChange: vi.fn() } },
    )

    await settle()
    rerender({ onChange: vi.fn() })
    rerender({ onChange: vi.fn() })
    await settle()
    expect(fetch).toHaveBeenCalledOnce()
  })
})
