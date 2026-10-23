/**
 * Idiomas: los diccionarios no se desvían del español y las frases de ánimo
 * están completas en todos.
 */

import { describe, expect, it } from 'vitest'

import { cheerFor } from '../src/features/help/cheers'
import ca from 'virtual:textos/ca'
import en from 'virtual:textos/en'
import es from 'virtual:textos/es'
import eu from 'virtual:textos/eu'
import { pluralOf } from '../src/shared/i18n'
import { localeOf } from '../src/shared/i18n/locale'
import { treeOf } from './tree-of'

const LANGS = ['es', 'en', 'ca', 'eu'] as const
const OTHERS = { en, ca, eu }

/** Los huecos de un texto (`{login}`, `{n}`…), ordenados. */
const holes = (text: string): string[] => (text.match(/\{\w+\}/g) ?? []).sort()

describe('idiomas', () => {
  it.each(Object.entries(OTHERS))('%s no tiene claves que no existan en español', (_, dict) => {
    expect(Object.keys(dict).filter((key) => !(key in es))).toEqual([])
  })

  it.each(Object.entries(OTHERS))('%s conserva los huecos de cada texto', (_, dict) => {
    const broken = Object.entries(dict).filter(
      ([key, text]) => holes(text).join() !== holes(es[key] ?? '').join(),
    )

    expect(broken.map(([key]) => key)).toEqual([])
  })

  it.each(Object.entries(OTHERS))('%s no deja ningún texto vacío', (_, dict) => {
    expect(Object.values(dict).filter((text) => text.trim() === '')).toEqual([])
  })

  it('catalán y euskera traducen todo lo que ve cualquier persona', () => {
    // Lo único que se queda en español es el panel de gestión.
    const visible = Object.keys(es).filter((key) => !/^(admin|quota|staff|legal\.doc)\./.test(key))

    for (const dict of [ca, eu]) {
      const missing = visible.filter((key) => !(key in dict))

      expect(missing).toEqual([])
    }
  })

  it('las listas separadas por comas tienen los mismos elementos', () => {
    for (const key of ['tour.days', 'therapy.days.short', 'cal.months']) {
      const size = es[key]?.split(',').length

      if (size === undefined) continue

      for (const dict of Object.values(OTHERS)) {
        expect((dict[key] ?? es[key] ?? '').split(',')).toHaveLength(size)
      }
    }
  })

  it('cada idioma escribe las fechas a su manera', () => {
    expect(LANGS.map(localeOf)).toEqual(['es-ES', 'en-GB', 'ca-ES', 'eu-ES'])
    expect(localeOf('xx')).toBe('es-ES')
  })
})

describe('plurales', () => {
  it('cada texto con forma «.one» tiene su «.many», y al revés', () => {
    const keys = Object.keys(es)
    const lonely = keys.filter(
      (key) =>
        (key.endsWith('.one') && !(key.replace(/\.one$/, '.many') in es)) ||
        (key.endsWith('.many') && !(key.replace(/\.many$/, '.one') in es)),
    )

    expect(lonely).toEqual([])
  })

  it('la forma sale de las reglas del idioma: uno es «one»; cero, dos o 1,5, «many»', () => {
    for (const lang of LANGS) {
      expect(pluralOf(lang, 1)).toBe('one')
      expect(pluralOf(lang, 0)).toBe('many')
      expect(pluralOf(lang, 2)).toBe('many')
      expect(pluralOf(lang, 1.5)).toBe('many')
    }
  })
})

describe('frases de ánimo', () => {
  /** Todas las frases de una lista, recorriéndola entera. */
  const all = (lang: (typeof LANGS)[number], offering: boolean): string[] =>
    Array.from({ length: 50 }, (_, index) => cheerFor(treeOf(lang), offering, (index + 0.5) / 50))

  it.each(LANGS)('%s tiene cien frases distintas: 50 que invitan y 50 que agradecen', (lang) => {
    const phrases = [...all(lang, false), ...all(lang, true)]

    expect(new Set(phrases).size).toBe(100)
    expect(phrases.every((phrase) => phrase.length > 8)).toBe(true)
  })

  it('con el azar al límite sigue saliendo una frase', () => {
    expect(cheerFor(treeOf('eu'), true, 0.999999)).not.toBe('')
    expect(cheerFor(treeOf('ca'), false, 1)).not.toBe('')
  })
})
