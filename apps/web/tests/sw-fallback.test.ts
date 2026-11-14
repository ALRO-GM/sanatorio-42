/**
 * El service worker (`public/sw.js`) durante un despliegue (#104 del buzón):
 * si la app no está y Caddy contesta 502/503/504, la portada sale de la caché
 * para que la web arranque y enseñe su pantalla de espera con el minijuego.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

const source = readFileSync(join(__dirname, '../public/sw.js'), 'utf8')

type Fake = { status: number; ok: boolean; body: string; clone: () => Fake }

const response = (status: number, body = ''): Fake => {
  const made: Fake = { status, ok: status >= 200 && status < 300, body, clone: () => made }

  return made
}

/**
 * Carga el service worker con una red y una caché de mentira, y devuelve lo
 * que contesta a una navegación a `path`.
 */
async function navigate(
  path: string,
  network: () => Promise<Fake>,
  saved: Fake | undefined,
): Promise<Fake> {
  const listeners = new Map<string, (event: unknown) => void>()
  const stored = new Map<string, Fake>(saved === undefined ? [] : [['/', saved]])
  const cache = {
    match: (key: string) => Promise.resolve(stored.get(key)),
    put: (key: string, value: Fake) => {
      stored.set(key, value)

      return Promise.resolve()
    },
    keys: () => Promise.resolve([]),
    delete: () => Promise.resolve(true),
  }
  const self = {
    location: { origin: 'https://peer4u.test' },
    addEventListener: (name: string, listener: (event: unknown) => void) => {
      listeners.set(name, listener)
    },
    skipWaiting: () => undefined,
    clients: { claim: () => Promise.resolve() },
  }

  runInNewContext(source, {
    self,
    caches: {
      open: () => Promise.resolve(cache),
      keys: () => Promise.resolve([]),
      delete: () => Promise.resolve(true),
    },
    fetch: network,
    URL,
    Response: { error: () => response(0) },
    Promise,
  })

  let answer: Promise<Fake> | undefined
  const request = {
    method: 'GET',
    mode: 'navigate',
    url: `https://peer4u.test${path}`,
    headers: { has: () => false },
  }

  listeners.get('fetch')?.({
    request,
    respondWith: (value: Promise<Fake>) => {
      answer = value
    },
  })

  if (answer === undefined) throw new Error('el service worker no ha contestado')

  return answer
}

const PORTADA = response(200, '<html>portada guardada</html>')

describe('service worker: la portada mientras se despliega', () => {
  it('normal: con la app en marcha, la portada de la red', async () => {
    const fresh = response(200, '<html>nueva</html>')

    expect(await navigate('/', () => Promise.resolve(fresh), PORTADA)).toBe(fresh)
  })

  it('límite: con 502, 503 o 504 sale la guardada', async () => {
    for (const status of [502, 503, 504]) {
      expect(await navigate('/', () => Promise.resolve(response(status)), PORTADA)).toBe(PORTADA)
    }
  })

  it('vacío: sin portada guardada (primera visita) llega el error tal cual', async () => {
    const down = response(502)

    expect(await navigate('/', () => Promise.resolve(down), undefined)).toBe(down)
  })

  it('imprevisible: un 404 o un 500 no se tapan con la guardada', async () => {
    for (const status of [404, 500]) {
      const other = response(status)

      expect(await navigate('/', () => Promise.resolve(other), PORTADA)).toBe(other)
    }
  })

  it('sin red, como antes: la guardada', async () => {
    expect(await navigate('/', () => Promise.reject(new Error('sin red')), PORTADA)).toBe(PORTADA)
  })
})
