/**
 * Privacidad y condiciones: los dos idiomas dicen lo mismo, y nada va vacío.
 */

import { describe, expect, it } from 'vitest'

import { legalText } from '../src/features/legal/text'
import { treeOf } from './tree-of'

describe('texto legal', () => {
  const es = legalText(treeOf('es')).text
  const en = legalText(treeOf('en')).text

  it('castellano e inglés tienen las mismas partes', () => {
    expect(en.summary).toHaveLength(es.summary.length)
    expect(en.sections).toHaveLength(es.sections.length)
    en.sections.forEach((section, index) => {
      const other = es.sections[index]

      expect(section.body.map((part) => (typeof part === 'string' ? 1 : part.length))).toEqual(
        other?.body.map((part) => (typeof part === 'string' ? 1 : part.length)),
      )
    })
  })

  it('no hay títulos, frases ni puntos vacíos', () => {
    for (const text of [es, en]) {
      const all = [
        text.title,
        ...text.summary,
        ...text.sections.flatMap((section) => [section.heading, ...section.body.flat()]),
      ]

      expect(all.filter((line) => line.trim() === '')).toEqual([])
    }
  })

  it('catalán y euskera ven el castellano, y lo dice', () => {
    expect(legalText(treeOf('ca'))).toEqual({ text: es, translated: false })
    expect(legalText(treeOf('eu'))).toEqual({ text: es, translated: false })
    expect(legalText(treeOf('es')).translated).toBe(true)
    expect(legalText(treeOf('xx')).translated).toBe(false)
  })
})
