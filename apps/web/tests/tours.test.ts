/**
 * Demostraciones animadas: los guiones caben en su tiempo y cada frase que
 * enseñan existe en todos los idiomas.
 */

import { describe, expect, it } from 'vitest'

import ca from 'virtual:textos/ca'
import en from 'virtual:textos/en'
import es from 'virtual:textos/es'
import eu from 'virtual:textos/eu'
import fr from 'virtual:textos/fr'
import { click, cut, paced, READ_MS, typing } from '../src/shared/tour/Tour'
import type { TourDef } from '../src/shared/tour/Tour'

/**
 * Todas las demostraciones: cada fichero `*Tour.tsx` exporta su `TOUR`
 * (`defineTour`). Una nueva entra sola en estos tests.
 */
const MODULES = import.meta.glob<{ TOUR?: TourDef<object> }>('../src/features/**/*Tour.tsx', {
  eager: true,
})
const DEFS = Object.values(MODULES).flatMap((module) =>
  module.TOUR === undefined ? [] : [[module.TOUR.name, module.TOUR] as const],
)
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

  it.each(DEFS)('%s: cada paso tiene su título en los cuatro idiomas', (name, tour) => {
    for (const step of tour.steps) {
      for (const dict of [es, en, ca, eu]) {
        expect(dict[`tour.${name}.title.${step}`], `tour.${name}.title.${step}`).toBeTruthy()
      }
    }
  })

  it.each(DEFS)('%s: los sitios de la web van a pasos que existen', (_, tour) => {
    for (const step of Object.keys(tour.spots)) {
      expect(tour.steps).toContain(Number(step))
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

  // Las marcas de tiempo coinciden con lo que se explica (2026-11-13): el
  // motor da a cada frase el tiempo de leerla, en cada idioma, sin partir
  // ninguna acción ni desordenar el guion.
  describe.each([
    ['es', es],
    ['en', en],
    ['ca', ca],
    ['eu', eu],
    ['fr', fr],
  ] as const)('tiempo de lectura (%s)', (_lang, dict) => {
    it.each(DEFS)('%s: cada frase dura lo que se tarda en leerla', (name, tour) => {
      const letters = (caption: number): number =>
        (dict[`tour.${name}.${caption}`] ?? es[`tour.${name}.${caption}`] ?? '').length
      const script = paced(tour.script, letters) as readonly AnyCue[]
      const end = Math.max(...script.map(([at]) => at)) + 1800
      const starts = [
        [0, 1] as const,
        ...script.flatMap(([at, cue]) =>
          cue.caption === undefined ? [] : [[at, cue.caption] as const],
        ),
      ]

      starts.forEach(([at, caption], index) => {
        const until = starts[index + 1]?.[0] ?? end

        expect(until - at, `tour.${name}.${caption}`).toBeGreaterThanOrEqual(
          letters(caption) * READ_MS,
        )
      })
      // Nada se adelanta ni cambia de orden, y ninguna demostración se eterniza.
      expect(script.map(([at]) => at)).toEqual([...script.map(([at]) => at)].sort((a, b) => a - b))
      // (salvo el respiro que gana la última frase, un paso vacío al final)
      expect(script.slice(0, tour.script.length).map(([, cue]) => cue)).toEqual(
        [...(tour.script as readonly AnyCue[])].sort((a, b) => a[0] - b[0]).map(([, cue]) => cue),
      )
      expect(end).toBeLessThanOrEqual(32_000)
    })
  })

  it('una frase larga retrasa lo que viene, sin partir el clic que trae la siguiente', () => {
    const script = [
      ...click<{ on: boolean }>(1000, 'a', { on: true, caption: 2 }),
      ...cut<{ on: boolean }>(2500, { scene: 1, caption: 3 }),
    ]
    // La primera frase pide 3 000 ms y la segunda llegaba a los 1 700: faltan 1 300.
    const slow = paced(script, (caption) => (caption === 1 ? 3000 / READ_MS : 0))

    expect(slow.map(([at]) => at)).toEqual([2300, 2920, 3000, 3130, 3800, 4200, 4550])
    // Con tiempo de sobra no se toca; vacío, tampoco; y la última gana su respiro.
    expect(paced(script, () => 1)).toEqual(script)
    expect(paced([], () => 0)).toEqual([])
    expect(
      paced<object>([[500, { caption: 2 }]], (caption) => (caption === 2 ? 100 : 0)).at(-1),
    ).toEqual([500 + 100 * READ_MS - 1800, {}])
  })

  it('un guion apuntado fuera de orden se ordena al definirlo', () => {
    for (const [, tour] of DEFS) {
      const times = tour.script.map(([at]) => at)

      expect(times).toEqual([...times].sort((a, b) => a - b))
    }
  })

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
