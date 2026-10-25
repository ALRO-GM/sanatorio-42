/**
 * Cómo se lee el sitio guardado de una sugerencia (`modules/admin/suggestions.ts`):
 * lo que no se entiende se queda en `null` en vez de romper el buzón.
 */

import { describe, expect, it } from 'vitest'

import { placeFrom } from '../../src/modules/admin/suggestions.js'

const PLACE = {
  section: 'red',
  label: 'Endogamia',
  detail: null,
  selector: '[data-feedback="red.endogamy"]',
  hash: '#/red',
  viewport: { width: 1280, height: 800 },
  theme: 'classic-light',
  lang: 'en',
  mode: 'datos',
  version: null,
}

describe('placeFrom', () => {
  it('lee un sitio bien guardado', () => {
    expect(placeFrom(JSON.stringify(PLACE))).toEqual(PLACE)
    expect(placeFrom(JSON.stringify({ ...PLACE, version: 'abc' }))?.version).toBe('abc')
  })

  it('sin sitio, o con uno que no se entiende, null', () => {
    for (const stored of [null, undefined, '', 42, '{', '{}', '[]', 'null']) {
      expect(placeFrom(stored)).toBeNull()
    }
    expect(placeFrom(JSON.stringify({ ...PLACE, mode: 'loco' }))).toBeNull()
  })
})
