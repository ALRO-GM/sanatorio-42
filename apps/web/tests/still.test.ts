// @vitest-environment jsdom
/**
 * La web «quieta»: sin nadie mirando (pestaña oculta, sin foco o un rato sin
 * tocar nada) se marca en `<html>` para que las animaciones se paren, y al
 * volver a tocar se desmarca.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { STILL_AFTER_MS, watchStill } from '../src/shared/still'

const still = (): string | undefined => document.documentElement.dataset.still
let focused = true
let hidden = false

beforeAll(() => {
  vi.useFakeTimers()
  vi.spyOn(document, 'hasFocus').mockImplementation(() => focused)
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  watchStill()
})

afterAll(() => {
  vi.useRealTimers()
})

describe('web quieta', () => {
  it('al arrancar, con alguien delante, se mueve', () => {
    expect(still()).toBe('off')
  })

  it('tocar algo antes de tiempo la mantiene despierta', () => {
    vi.advanceTimersByTime(STILL_AFTER_MS - 1000)
    window.dispatchEvent(new Event('pointermove'))
    vi.advanceTimersByTime(STILL_AFTER_MS - 1000)

    expect(still()).toBe('off')
  })

  it('sin tocar nada un rato, se queda quieta; al tocar, vuelve', () => {
    vi.advanceTimersByTime(STILL_AFTER_MS)

    expect(still()).toBe('on')

    window.dispatchEvent(new KeyboardEvent('keydown'))

    expect(still()).toBe('off')
  })

  it('con otra ventana delante, quieta al momento; al volver, se mueve', () => {
    focused = false
    window.dispatchEvent(new Event('blur'))

    expect(still()).toBe('on')

    focused = true
    window.dispatchEvent(new Event('focus'))

    expect(still()).toBe('off')
  })

  it('con la pestaña oculta, quieta aunque llegue algún evento', () => {
    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))

    expect(still()).toBe('on')

    window.dispatchEvent(new Event('scroll'))

    expect(still()).toBe('on')

    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))

    expect(still()).toBe('off')
  })
})
