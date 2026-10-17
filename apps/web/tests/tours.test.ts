/**
 * Demostraciones animadas: los guiones caben en su tiempo y cada frase que
 * enseñan existe en todos los idiomas.
 */

import { describe, expect, it } from 'vitest'

import ca from 'virtual:textos/ca'
import en from 'virtual:textos/en'
import es from 'virtual:textos/es'
import eu from 'virtual:textos/eu'
import { click, cut, typing } from '../src/shared/tour/Tour'
import type { TourDef } from '../src/shared/tour/Tour'

/**
 * Todas las demostraciones: cada fichero `*Tour.tsx` exporta su `TOUR`
 * (`defineTour`). Una nueva entra sola en estos tests.
 */
const MODULES = import.meta.glob<{ TOUR?: TourDef<object> }>('../src/features/**/*Tour.tsx', {
  eager: true,
})
const TOURS = Object.fromEntries(
  Object.values(MODULES).flatMap((module) =>
    module.TOUR === undefined ? [] : [[module.TOUR.name, module.TOUR.script]],
  ),
)

/** Lo más largo que puede ser una frase de demostración, en español. */
const MAX_CAPTION = 70

type AnyCue = readonly [number, { caption?: number; press?: boolean; dark?: boolean }]

describe('demostraciones', () => {
  it('cada fichero de demostración exporta su TOUR con un nombre distinto', () => {
    const files = Object.keys(MODULES)

    expect(files.length).toBeGreaterThan(9)
    expect(Object.keys(TOURS)).toHaveLength(files.length)
  })

  it.each(Object.entries(TOURS))('%s: frases cortas, numeradas desde 1 y sin huecos', (name) => {
    const numbers = Object.keys(es)
      .filter((key) => new RegExp(`^tour\\.${name}\\.\\d+$`).test(key))
      .map((key) => Number(key.split('.').at(-1)))
      .sort((a, b) => a - b)

    expect(numbers).toEqual(numbers.map((_, index) => index + 1))
    for (const n of numbers) {
      expect((es[`tour.${name}.${n}`] ?? '').length, `tour.${name}.${n}`).toBeLessThanOrEqual(
        MAX_CAPTION,
      )
    }
  })

  it.each(Object.entries(TOURS))(
    '%s: el guion usa todas sus frases de la tabla',
    (name, script) => {
      const used = new Set([1, ...(script as readonly AnyCue[]).map(([, cue]) => cue.caption ?? 1)])
      const inTable = Object.keys(es).filter((key) =>
        new RegExp(`^tour\\.${name}\\.\\d+$`).test(key),
      )

      expect(inTable.filter((key) => !used.has(Number(key.split('.').at(-1))))).toEqual([])
    },
  )

  it.each(Object.entries(TOURS))('%s: el guion dura 20 s como mucho', (_, script) => {
    const end = Math.max(...(script as readonly AnyCue[]).map(([at]) => at))

    expect(end).toBeLessThanOrEqual(20_000)
  })

  it.each(Object.entries(TOURS))('%s: cada frase existe en los cuatro idiomas', (name, script) => {
    const captions = new Set([
      1,
      ...(script as readonly AnyCue[]).map(([, cue]) => cue.caption ?? 1),
    ])

    for (const caption of captions) {
      for (const dict of [es, en, ca, eu]) {
        expect(dict[`tour.${name}.${caption}`], `tour.${name}.${caption}`).toBeTruthy()
      }
    }
  })

  it.each(Object.entries(TOURS))(
    '%s: el ratón siempre suelta y la pantalla vuelve',
    (_, script) => {
      // Lo último que se dice del botón es que está suelto, y del fundido, que se ha ido.
      const last = (key: 'press' | 'dark'): boolean | undefined =>
        [...(script as readonly AnyCue[])]
          .sort(([a], [b]) => a - b)
          .reduce<boolean | undefined>((value, [, cue]) => cue[key] ?? value, undefined)

      expect(last('press') ?? false).toBe(false)
      expect(last('dark') ?? false).toBe(false)
    },
  )

  it('un clic llega, aprieta, cambia y suelta, en ese orden', () => {
    expect(click<{ on: boolean }>(1000, 'save', { on: true })).toEqual([
      [1000, { cursor: 'save' }],
      [1620, { press: true }],
      [1700, { on: true }],
      [1830, { press: false }],
    ])
  })

  it('un cambio de escena funde a negro, cambia y vuelve', () => {
    expect(cut<object>(500, { scene: 1 }).map(([at]) => at)).toEqual([500, 900, 1250])
  })

  it('escribir va letra a letra', () => {
    expect(typing<{ typed: number }>(0, 'typed', 3, 100)).toEqual([
      [0, { typed: 1 }],
      [100, { typed: 2 }],
      [200, { typed: 3 }],
    ])
  })
})
