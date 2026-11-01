/**
 * El pace guardado (`shared/pace.ts`): lo que no es un pace de la tabla no
 * vale, y con el almacenamiento bloqueado ni leer ni guardar rompen nada.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadPace, savePace } from '../src/shared/pace'

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

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('pace guardado', () => {
  it('se guarda, se lee y se borra', () => {
    vi.stubGlobal('localStorage', memory())

    expect(loadPace()).toBeNull()
    savePace(15)
    expect(loadPace()).toBe(15)
    savePace(null)
    expect(loadPace()).toBeNull()
  })

  it('lo que no es un pace de la tabla no vale', () => {
    const store = memory()

    vi.stubGlobal('localStorage', store)
    for (const value of ['0', '13', '-8', '15.5', 'quince', '1e309', '']) {
      store.setItem('sanatorio_pace', value)
      expect(loadPace(), value).toBeNull()
    }
  })

  it('con el almacenamiento bloqueado no hay pace y guardar no lanza', () => {
    const blocked = () => {
      throw new DOMException('bloqueado', 'SecurityError')
    }

    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked, removeItem: blocked })
    expect(loadPace()).toBeNull()
    expect(() => {
      savePace(15)
    }).not.toThrow()
    expect(() => {
      savePace(null)
    }).not.toThrow()
  })
})
