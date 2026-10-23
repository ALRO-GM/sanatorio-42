import { act, cleanup, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider, useI18n } from '../../src/shared/i18n'
import { Async } from '../../src/shared/ui/Async'
import { must } from './must'

const text = (key: string): string => must(es[key], `el texto ${key}`)

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>

afterEach(() => {
  cleanup()
})

function show(state: Parameters<typeof Async<string[]>>[0]['state']) {
  localStorage.setItem('sanatorio_lang', 'es')
  render(
    <I18nProvider>
      <Async state={state} empty={(data) => data.length === 0} emptyText="Nadie todavía">
        {(data) => <p>{data.join(', ')}</p>}
      </Async>
    </I18nProvider>,
  )
}

describe('Async: cargando, error y vacío siempre iguales', () => {
  it('mientras llega, «Cargando…»; con datos, lo que toque; vacío, su texto', () => {
    const reload = vi.fn(() => Promise.resolve())

    show({ data: undefined, error: null, loading: true, reload })
    expect(screen.getByText(text('app.loading'))).toBeTruthy()
    cleanup()

    show({ data: ['ana', 'bea'], error: null, loading: false, reload })
    expect(screen.getByText('ana, bea')).toBeTruthy()
    cleanup()

    show({ data: [], error: null, loading: false, reload })
    expect(screen.getByText('Nadie todavía')).toBeTruthy()
  })

  it('si falla, se dice y se puede reintentar', async () => {
    const user = userEvent.setup()
    const reload = vi.fn(() => Promise.resolve())

    show({ data: undefined, error: new Error('se cayó'), loading: false, reload })
    expect(screen.getByRole('alert')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: text('app.retry') }))
    expect(reload).toHaveBeenCalledOnce()
  })
})

describe('tn: un plural con una sola regla', () => {
  it('elige .one o .many y pone la cantidad en {n}', () => {
    localStorage.setItem('sanatorio_lang', 'es')
    const { result } = renderHook(() => useI18n(), { wrapper })

    act(() => undefined)
    expect(result.current.tn('xp.got', 1)).toBe(text('xp.got.one').replace('{n}', '1'))
    expect(result.current.tn('xp.got', 3)).toBe(text('xp.got.many').replace('{n}', '3'))
    expect(result.current.tn('map.rowLong', 2, { rows: '1, 2' })).toBe(
      text('map.rowLong.many').replace('{rows}', '1, 2'),
    )
  })
})
