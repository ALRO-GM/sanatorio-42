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
import fr from 'virtual:textos/fr'
import { LANGS as ALL, loadLang, lookup, pluralOf } from '../src/shared/i18n'
import { pickTree } from '../src/shared/i18n/tree'
import { localeOf } from '../src/shared/i18n/locale'
import { treeOf } from './tree-of'

const LANGS = ['es', 'en', 'ca', 'eu', 'fr'] as const
const OTHERS = { en, ca, eu, fr }

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
    expect(LANGS.map(localeOf)).toEqual(['es-ES', 'en-GB', 'ca-ES', 'eu-ES', 'fr-FR'])
    expect(localeOf('xx')).toBe('es-ES')
  })
})

describe('francés', () => {
  it('sale en el selector como «Français» y cae al inglés', () => {
    expect(ALL.fr.name).toBe('Français')
    expect(ALL.fr.fallback).toBe('en')
  })

  it('un texto sin francés sale en inglés; sin inglés, en español', async () => {
    await loadLang('fr')

    for (const key of Object.keys(es)) {
      expect(lookup('fr', key)).toBe(fr[key] ?? en[key] ?? es[key])
    }
    // Mientras la tabla no tenga su francés, lo que se ve es el inglés.
    if (fr['app.loading'] === undefined) expect(lookup('fr', 'app.loading')).toBe('Loading…')
    expect(lookup('fr', 'no.existe')).toBeUndefined()
  })

  it('un texto largo sin francés sale en inglés y dice que no está traducido', () => {
    const own = { 'x.doc.title': 'Titre' }
    const english = { 'x.doc.title': 'Title', 'x.list.1': 'One' }
    const spanish = { 'x.doc.title': 'Título', 'x.list.1': 'Uno', 'x.only.1': 'Solo' }

    expect(pickTree(own, spanish, 'x.doc', false, english)).toEqual({
      value: { title: 'Titre' },
      translated: true,
    })
    expect(pickTree(own, spanish, 'x.list', false, english)).toEqual({
      value: ['One'],
      translated: false,
    })
    expect(pickTree(own, spanish, 'x.only', false, english)).toEqual({
      value: ['Solo'],
      translated: false,
    })
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
    for (const lang of LANGS.filter((code) => code !== 'fr')) {
      expect(pluralOf(lang, 1)).toBe('one')
      expect(pluralOf(lang, 0)).toBe('many')
      expect(pluralOf(lang, 2)).toBe('many')
      expect(pluralOf(lang, 1.5)).toBe('many')
    }
  })

  it('en francés, cero y 1,5 van en singular («0 réponse»); dos y un millón, en plural', () => {
    expect(pluralOf('fr', 0)).toBe('one')
    expect(pluralOf('fr', 1)).toBe('one')
    expect(pluralOf('fr', 1.5)).toBe('one')
    expect(pluralOf('fr', 2)).toBe('many')
    // Intl llama «many» a la forma de los millones («1 000 000 de réponses»).
    expect(pluralOf('fr', 1_000_000)).toBe('many')
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
