/**
 * `docs/api.md` cuenta todas las rutas que hay: una ruta nueva sin documentar,
 * o una documentada que ya no existe, rompe este test.
 */

import { readFileSync } from 'node:fs'

import { afterEach, describe, expect, it } from 'vitest'

import { makeApp } from '../helpers/test-app.js'
import type { TestApp } from '../helpers/test-app.js'

const DOC = readFileSync(new URL('../../../../docs/api.md', import.meta.url), 'utf8')

/** Las rutas que nombra el documento: `GET /ruta`, en una lista o en un bloque. */
function documented(): Set<string> {
  const found = new Set<string>()

  for (const match of DOC.matchAll(/\b(GET|POST|PUT|PATCH|DELETE)\s+(\/[^\s`?)]*)/g)) {
    const path = (match[2] ?? '').replace(/[.,;:]+$/, '')

    // Las de la API de 42 (`/v2/…`) se nombran para explicar de dónde sale algo.
    if (!path.startsWith('/v2/')) found.add(`${match[1] ?? ''} ${path}`)
  }

  return found
}

let built: TestApp | undefined

afterEach(async () => {
  await built?.close()
  built = undefined
})

describe('docs/api.md', () => {
  it('documenta cada ruta de la API, y solo las que hay', async () => {
    built = await makeApp()

    // `OPTIONS /*` es la respuesta de CORS: no es una ruta que se use.
    const real = new Set(
      built.routes
        .filter((route) => route.method !== 'OPTIONS')
        .map((route) => `${route.method} ${route.url}`),
    )
    const docs = documented()

    expect([...real].filter((route) => !docs.has(route)).sort(), 'sin documentar').toEqual([])
    expect([...docs].filter((route) => !real.has(route)).sort(), 'ya no existen').toEqual([])
  })
})
