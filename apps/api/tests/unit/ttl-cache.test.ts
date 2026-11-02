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

  it('con «staleMs», lo caducado se sigue dando mientras se rehace de fondo, una sola vez', async () => {
    let clock = 0
    let loads = 0
    let release: (() => void) | undefined
    const cache = createTtlCache<number>({
      ttlMs: 100,
      staleMs: 1_000,
      maxEntries: 5,
      now: () => clock,
    })
    const slow = (): Promise<number> => {
      loads += 1

      const value = loads

      return new Promise((resolve) => {
        release = () => {
          resolve(value)
        }
      })
    }

    const first = cache.get('a', slow)
    release?.()
    expect(await first).toBe(1)

    // Caducado: sale el 1 al momento, aunque el 2 aún no esté.
    clock = 150
    expect(await cache.get('a', slow)).toBe(1)
    expect(await cache.get('a', slow)).toBe(1)
    expect(loads).toBe(2)

    release?.()
    await Promise.resolve()
    await Promise.resolve()
    expect(await cache.get('a', slow)).toBe(2)

    // Pasado también el margen, se espera al cálculo como siempre.
    clock = 5_000
    const late = cache.get('a', slow)
    release?.()
    expect(await late).toBe(3)
  })

  it('si rehacer de fondo falla o el tope salta, se sigue dando lo de antes', async () => {
    let clock = 0
    const cache = createTtlCache<string>({
      ttlMs: 100,
      staleMs: 1_000,
      maxEntries: 5,
      now: () => clock,
    })

    expect(await cache.get('a', () => Promise.resolve('viejo'))).toBe('viejo')
    clock = 150
    expect(await cache.get('a', () => Promise.reject(new Error('boom')))).toBe('viejo')
    await Promise.resolve()
    expect(
      await cache.get('a', () => {
        throw new Error('tope')
      }),
    ).toBe('viejo')
    expect(await cache.get('a', () => Promise.resolve('nuevo'))).toBe('viejo')
    await Promise.resolve()
    await Promise.resolve()
    expect(await cache.get('a', () => Promise.resolve('otro'))).toBe('nuevo')
  })
})
