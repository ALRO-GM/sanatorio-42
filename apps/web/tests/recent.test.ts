/**
 * Búsquedas recientes: las últimas ocho, sin repetir, cada buscador con las suyas.
 */

import { describe, expect, it } from 'vitest'

import { forget, recentOf, remember, RECENT_MAX } from '../src/shared/recent'

const memory = () => {
  const data = new Map<string, string>()

  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    removeItem: (key: string) => {
      data.delete(key)
    },
  }
}

describe('búsquedas recientes', () => {
  it('la última buscada va arriba y no se repite', () => {
    const store = memory()

    remember('people', { login: 'ana', image: null }, store)
    remember('people', { login: 'leo', image: 'x' }, store)
    remember('people', { login: 'ana', image: null }, store)
    expect(recentOf('people', store).map((p) => p.login)).toEqual(['ana', 'leo'])
  })

  it('se recuerdan ocho; la novena echa a la más vieja', () => {
    const store = memory()

    for (let index = 0; index <= RECENT_MAX; index += 1) {
      remember('people', { login: `p${index}`, image: null }, store)
    }
    expect(recentOf('people', store)).toHaveLength(RECENT_MAX)
    expect(recentOf('people', store).at(-1)?.login).toBe('p1')
  })

  it('cada buscador con las suyas, y se pueden olvidar', () => {
    const store = memory()

    remember('people', { login: 'ana', image: null }, store)
    remember('network', { login: 'leo', image: null }, store)
    expect(recentOf('network', store).map((p) => p.login)).toEqual(['leo'])
    forget('people', store)
    expect(recentOf('people', store)).toEqual([])
    expect(recentOf('network', store)).toHaveLength(1)
  })

  it('lo guardado roto o raro no se enseña; sin almacenamiento, nada', () => {
    const store = memory()

    store.setItem('sanatorio_recent_people', 'no es json')
    expect(recentOf('people', store)).toEqual([])
    store.setItem(
      'sanatorio_recent_people',
      JSON.stringify([{ login: '<script>' }, { login: 'ana', image: 5 }, 'texto', null]),
    )
    expect(recentOf('people', store)).toEqual([{ login: 'ana', image: null }])
    expect(recentOf('people', null)).toEqual([])
    expect(remember('people', { login: 'ana', image: null }, null)).toHaveLength(1)
  })
})
