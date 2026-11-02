/**
 * Las cargas largas (`shared/ui/LoadingActivity.tsx`, `shared/ui/Async.tsx`,
 * `useAsync` con `keep`, `shared/loadMemory.ts`, `useReveal`): que se vea que
 * algo pasa y que al volver a una sección salga al momento.
 */

import { act, cleanup, render, renderHook, screen } from '@testing-library/react'
import es from 'virtual:textos/es'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NetworkLink, NetworkNode } from '@sanatorio/contracts'

import { useReveal } from '../../src/features/network/reveal'
import { forgetKept, useAsync } from '../../src/shared/hooks/useAsync'
import { I18nProvider } from '../../src/shared/i18n'
import { expectedTotals, readLoad, timedLoad } from '../../src/shared/loadMemory'
import { Async } from '../../src/shared/ui/Async'
import { LoadingActivity, progressAt } from '../../src/shared/ui/LoadingActivity'
import { must } from './must'

const text = (key: string): string => must(es[key], `el texto ${key}`)
const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('sanatorio_lang', 'es')
  forgetKept()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

/** Las cifras que enseña el aviso, como números. */
const figures = (): number[] =>
  [...document.querySelectorAll('.activity-stats li')].map((item) =>
    Number(item.textContent.replace(/\D/g, '')),
  )

describe('aviso de carga', () => {
  it('avanza deprisa y luego despacio, sin llegar nunca al final', () => {
    expect(progressAt(0, 5_000)).toBe(0)
    expect(progressAt(2_500, 5_000)).toBeGreaterThan(0.5)
    expect(progressAt(60_000, 5_000)).toBeLessThan(1)
    expect(progressAt(10_000, 5_000)).toBeGreaterThan(progressAt(5_000, 5_000))
    // Una espera de 0 no divide por cero.
    expect(Number.isFinite(progressAt(1_000, 0))).toBe(true)
  })

  it('enseña tu burbuja, la fase y unas cifras que suben sin pasarse', () => {
    vi.useFakeTimers()
    render(
      <LoadingActivity
        steps={['seats.loading.read', 'seats.loading.near']}
        stats={[
          { key: 'seats.loading.hours', target: 1_000 },
          { key: 'seats.loading.pairs', target: 50 },
        ]}
        who={{ login: 'yo', image: null }}
        expectedMs={1_000}
      />,
      { wrapper },
    )

    expect(screen.getByRole('status').textContent).toBe(text('seats.loading.read'))
    expect(document.querySelector('.activity-me')).not.toBeNull()
    expect(figures()).toEqual([0, 0])

    act(() => {
      vi.advanceTimersByTime(400)
    })
    const early = figures()

    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    const late = figures()

    expect(early[0]).toBeGreaterThan(0)
    expect(late[0]).toBeGreaterThan(Number(early[0]))
    expect(late[0]).toBeLessThan(1_000)
    expect(late[1]).toBeLessThanOrEqual(50)
    expect(screen.getByRole('status').textContent).toBe(text('seats.loading.near'))
  })

  it('«Cargando…» dice que sigue en marcha si tarda', () => {
    vi.useFakeTimers()
    const reload = (): Promise<void> => Promise.resolve()

    render(
      <Async state={{ data: undefined, error: null, loading: true, reload }}>{() => null}</Async>,
      { wrapper },
    )

    expect(screen.getByText(text('app.loading'))).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    expect(screen.getByText(text('app.loadingSlow'))).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(6_000)
    })
    expect(screen.getByText(text('app.loadingAlmost'))).toBeTruthy()
  })
})

describe('lo que se recuerda', () => {
  it('cuánto tardó y sus cifras, para contar hacia ellas la próxima vez', async () => {
    expect(expectedTotals('red', { people: 10 })).toEqual({ ms: undefined, totals: { people: 10 } })

    await timedLoad(
      'red',
      () => Promise.resolve({ n: 7 }),
      (result) => ({ people: result.n }),
    )

    expect(readLoad('red')?.totals).toEqual({ people: 7 })
    expect(expectedTotals('red', { people: 10, pairs: 3 }).totals).toEqual({ people: 7, pairs: 3 })
  })

  it('con el almacenamiento roto o bloqueado, sigue sin él', async () => {
    localStorage.setItem('peer4u.load.roto', '{no es json')
    expect(readLoad('roto')).toBeNull()
    localStorage.setItem('peer4u.load.raro', JSON.stringify({ ms: 'x', totals: {} }))
    expect(readLoad('raro')).toBeNull()

    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => {
        throw new Error('bloqueado')
      },
    })
    expect(readLoad('red')).toBeNull()
    expect(
      await timedLoad(
        'red',
        () => Promise.resolve(1),
        () => ({}),
      ),
    ).toBe(1)
  })

  it('con `keep`, al volver se ve lo de la última vez al momento y se pone al día detrás', async () => {
    let answer = 'primera'
    const load = vi.fn(() => Promise.resolve(answer))
    const first = renderHook(() => useAsync(load, [], { keep: 'prueba' }))

    expect(first.result.current.data).toBeUndefined()
    await act(async () => {
      await Promise.resolve()
    })
    expect(first.result.current.data).toBe('primera')
    first.unmount()

    answer = 'segunda'
    const second = renderHook(() => useAsync(load, [], { keep: 'prueba' }))

    // Sin esperar: lo de antes, y sin «cargando».
    expect(second.result.current.data).toBe('primera')
    expect(second.result.current.loading).toBe(false)
    await act(async () => {
      await Promise.resolve()
    })
    expect(second.result.current.data).toBe('segunda')

    // Al cerrar la sesión se olvida.
    second.unmount()
    forgetKept()
    expect(renderHook(() => useAsync(load, [], { keep: 'prueba' })).result.current.data).toBe(
      undefined,
    )
  })
})

describe('aparición del grafo', () => {
  const nodes = ['yo', 'ana', 'bea', 'eva', 'leo'].map((login) => ({ login }) as NetworkNode)
  const links = [
    { source: 'yo', target: 'ana' },
    { source: 'ana', target: 'bea' },
  ] as NetworkLink[]

  it('un grafo nuevo sale desde ti por tandas, y el mismo recortado no vuelve a empezar', () => {
    vi.useFakeTimers()
    const view = renderHook(({ shown }) => useReveal(shown, links, 'yo'), {
      initialProps: { shown: nodes },
    })

    expect(view.result.current.nodes.map((node) => node.login)).toEqual(['yo'])
    expect(view.result.current.links).toEqual([])
    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(view.result.current.nodes).toHaveLength(5)
    expect(view.result.current.links).toHaveLength(2)

    // Un recorte de lo mismo: entero al momento.
    view.rerender({ shown: nodes.slice(0, 4) })
    expect(view.result.current.nodes).toHaveLength(4)
  })

  it('con «menos movimiento» en el sistema, sale entero', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const view = renderHook(() => useReveal(nodes, links, 'yo'))

    expect(view.result.current.nodes).toHaveLength(5)
  })
})
