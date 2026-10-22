/**
 * El banco de Not-games en inglés: cada concepto traducido tiene la misma forma
 * que el original (mismas formas, preguntas, buenas y malas, en el mismo
 * orden), porque una pregunta se monta por posiciones y luego se enseña en el
 * idioma de cada cual. Y cumple lo mismo que el español: los números, con
 * cifras, y cada buena con malas de su misma pinta.
 */
import { describe, expect, it } from 'vitest'

import { BANK, REVIEW } from '../../src/modules/quiz/bank/index.js'
import { BANK_EN } from '../../src/modules/quiz/bank/en/index.js'
import { REVIEW_EN } from '../../src/modules/quiz/bank/en/review.js'
import { localizeText } from '../../src/modules/quiz/bank/localize.js'
import { buildRound, localizeRound, seeded, shapeOf } from '../../src/modules/quiz/quiz.rules.js'

describe('banco de preguntas en inglés', () => {
  it('está todo el banco, y nada más', () => {
    const ids = BANK.map((concept) => concept.id)

    expect(ids.filter((id) => BANK_EN[id] === undefined)).toEqual([])
    expect(Object.keys(BANK_EN).filter((id) => !ids.includes(id))).toEqual([])
  })

  it.each(BANK.map((concept) => [concept.id, concept] as const))(
    '%s tiene la misma forma',
    (id, concept) => {
      const en = BANK_EN[id]

      if (en === undefined) return

      expect(en.forms.length).toBe(concept.forms.length)
      concept.forms.forEach((form, index) => {
        const other = en.forms[index]

        expect(other?.ask.length, `${id}#${String(index)} ask`).toBe(form.ask.length)
        expect(other?.right.length, `${id}#${String(index)} right`).toBe(form.right.length)
        expect(other?.wrong?.length ?? 0, `${id}#${String(index)} wrong`).toBe(
          form.wrong?.length ?? 0,
        )
        // Lo que es número, código o texto en español lo sigue siendo en inglés.
        form.right.forEach((right, at) => {
          expect(shapeOf(other?.right[at] ?? ''), `${id}: «${right}»`).toBe(shapeOf(right))
        })
        ;(form.wrong ?? []).forEach((wrong, at) => {
          expect(shapeOf(other?.wrong?.[at] ?? ''), `${id}: «${wrong}»`).toBe(shapeOf(wrong))
        })
      })
      expect(en.wrong.length).toBe(concept.wrong.length)
      concept.wrong.forEach((wrong, at) => {
        expect(shapeOf(en.wrong[at] ?? ''), `${id}: «${wrong}»`).toBe(shapeOf(wrong))
      })
      expect(en.why.length).toBeGreaterThan(10)
    },
  )

  it('el Repaso está entero en inglés', () => {
    expect(Object.keys(REVIEW_EN).sort()).toEqual(Object.keys(REVIEW).sort())
  })

  // Se traduce texto a texto: si un mismo texto en español tuviera dos
  // traducciones, la segunda no se vería nunca.
  it.each(BANK.map((concept) => [concept.id, concept] as const))(
    '%s traduce cada texto de una sola manera',
    (id, concept) => {
      const en = BANK_EN[id]
      const seen = new Map<string, string>()
      const pair = (from: readonly string[] = [], to: readonly string[] = []): void => {
        from.forEach((text, at) => {
          const other = to[at] ?? ''

          expect(seen.get(text) ?? other, `${id}: «${text}»`).toBe(other)
          seen.set(text, other)
        })
      }

      concept.forms.forEach((form, index) => {
        pair(form.ask, en?.forms[index]?.ask)
        pair(form.right, en?.forms[index]?.right)
        pair(form.wrong, en?.forms[index]?.wrong)
      })
      pair(concept.wrong, en?.wrong)
    },
  )

  it('una ronda montada se enseña en inglés, con la buena en su sitio', () => {
    const concept = BANK.find((each) => each.id === 'net-dns')

    if (concept === undefined) throw new Error('falta net-dns')

    for (let seed = 1; seed <= 20; seed++) {
      const round = buildRound(concept, seeded(seed))
      const shown = localizeRound(round, 'en')

      expect(shown.options).toHaveLength(round.options.length)
      expect(shown.prompt).not.toBe(round.prompt)
      expect(shown.why).toBe(BANK_EN['net-dns']?.why)
      expect(localizeRound(round, 'es')).toBe(round)
      // La buena sigue en la misma posición, ya traducida.
      expect(shown.options[shown.answer]).toBe(
        localizeText('net-dns', round.options[round.answer] ?? '', 'en'),
      )
    }
  })
})
