/**
 * El Pomodoro a pantalla completa no deja que la pantalla se apague
 * (`features/focus/useWakeLock.ts`): lo pide al abrirse, otra vez al volver a
 * la pestaña (el navegador lo suelta al esconderla) y lo suelta al cerrarse.
 */

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useWakeLock } from '../../src/features/focus/useWakeLock'

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock')
})

describe('bloqueo de pantalla del Pomodoro', () => {
  it('lo pide, lo repite al volver a la pestaña y lo suelta al cerrar', async () => {
    const release = vi.fn(() => Promise.resolve())
    const request = vi.fn(() => Promise.resolve({ release }))

    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } })

    const { unmount } = renderHook(() => {
      useWakeLock()
    })

    await act(async () => {
      await Promise.resolve()
    })
    expect(request).toHaveBeenCalledWith('screen')

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await Promise.resolve()
    })
    expect(request).toHaveBeenCalledTimes(2)

    unmount()
    expect(release).toHaveBeenCalled()
  })

  it('sin la API, no pasa nada', () => {
    expect(() =>
      renderHook(() => {
        useWakeLock()
      }),
    ).not.toThrow()
  })
})
