// @vitest-environment jsdom
/**
 * Tiempo activo en un punto de un curso: cuenta solo con la vista abierta, la
 * pestaña a la vista y algo de actividad en el último minuto; se suma entre
 * visitas y vuelve a cero al superar el punto.
 */

import { renderHook } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { activeSecondsOf, clearActiveTime, useActiveTime } from '../src/shared/course/activeTime'

let focused = true
let visibility: DocumentVisibilityState = 'visible'

beforeAll(() => {
  vi.useFakeTimers()
  vi.spyOn(document, 'hasFocus').mockImplementation(() => focused)
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibility,
  })
})

afterAll(() => {
  vi.useRealTimers()
})

beforeEach(() => {
  localStorage.clear()
  focused = true
  visibility = 'visible'
})

/** Pasa el tiempo tocando algo cada `every` milisegundos. */
function busy(ms: number, every = 10_000): void {
  for (let spent = 0; spent < ms; spent += every) {
    window.dispatchEvent(new Event('keydown'))
    vi.advanceTimersByTime(every)
  }
}

describe('tiempo activo en un curso', () => {
  it('cuenta mientras se usa y se guarda al salir', () => {
    const view = renderHook(() => {
      useActiveTime('shell', 'ls')
    })

    busy(60_000)
    view.unmount()

    expect(activeSecondsOf('shell', 'ls')).toBe(60)
    expect(activeSecondsOf('git', 'ls')).toBe(0)
  })

  it('sin tocar nada más de un minuto, deja de contar', () => {
    const view = renderHook(() => {
      useActiveTime('shell', 'cd')
    })

    window.dispatchEvent(new Event('pointerdown'))
    vi.advanceTimersByTime(5 * 60_000)
    view.unmount()

    expect(activeSecondsOf('shell', 'cd')).toBeLessThanOrEqual(60)
    expect(activeSecondsOf('shell', 'cd')).toBeGreaterThanOrEqual(55)
  })

  it('con la pestaña oculta o sin foco no cuenta', () => {
    const view = renderHook(() => {
      useActiveTime('git', 'w0-commit')
    })

    visibility = 'hidden'
    busy(30_000)
    visibility = 'visible'
    focused = false
    busy(30_000)
    view.unmount()

    expect(activeSecondsOf('git', 'w0-commit')).toBe(0)
  })

  it('se suma entre visitas y vuelve a cero al superar el punto', () => {
    for (let visit = 0; visit < 2; visit++) {
      const view = renderHook(() => {
        useActiveTime('git', 'w0-add')
      })

      busy(20_000)
      view.unmount()
    }

    expect(activeSecondsOf('git', 'w0-add')).toBe(40)
    clearActiveTime('git', 'w0-add')
    expect(activeSecondsOf('git', 'w0-add')).toBe(0)
  })

  it('lo guardado roto o enorme no rompe nada', () => {
    localStorage.setItem('sanatorio_course_time', 'no es json')
    expect(activeSecondsOf('shell', 'ls')).toBe(0)
    localStorage.setItem('sanatorio_course_time', '{"shell:ls":1e12,"shell:cd":"x"}')
    expect(activeSecondsOf('shell', 'ls')).toBe(6 * 3600)
    expect(activeSecondsOf('shell', 'cd')).toBe(0)
  })
})
