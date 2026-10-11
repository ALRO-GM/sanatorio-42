import { describe, expect, it } from 'vitest'

import { createTtlCache } from '../../src/core/ttl-cache.js'

describe('memoria con caducidad', () => {
  it('reutiliza el valor mientras está vigente y lo vuelve a pedir al caducar', async () => {
    let clock = 0
    let loads = 0
    const cache = createTtlCache<number>({ ttlMs: 100, maxEntries: 5, now: () => clock })
    const load = (): Promise<number> => Promise.resolve(++loads)

    expect(await cache.get('a', load)).toBe(1)
    clock = 99
    expect(await cache.get('a', load)).toBe(1)
    clock = 100
    expect(await cache.get('a', load)).toBe(2)
  })

  it('dos peticiones a la vez comparten la misma carga', async () => {
    let loads = 0
    const cache = createTtlCache<number>({ ttlMs: 100, maxEntries: 5 })
    const load = async (): Promise<number> => {
      loads += 1
      await Promise.resolve()

      return loads
    }

    expect(await Promise.all([cache.get('a', load), cache.get('a', load)])).toEqual([1, 1])
  })

  it('tira la entrada más antigua al pasarse del tope y no guarda los fallos', async () => {
    let loads = 0
    const cache = createTtlCache<string>({ ttlMs: 1_000, maxEntries: 2 })
    const load = (value: string) => (): Promise<string> => {
      loads += 1

      return Promise.resolve(value)
    }

    await cache.get('a', load('a'))
    await cache.get('b', load('b'))
    await cache.get('c', load('c'))
    await cache.get('b', load('b'))
    expect(loads).toBe(3)
    await cache.get('a', load('a'))
    expect(loads).toBe(4)

    await expect(cache.get('x', () => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    expect(await cache.get('x', load('ok'))).toBe('ok')
  })
})
