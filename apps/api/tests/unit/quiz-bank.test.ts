/**
 * El banco de Not-games está bien hecho: cada concepto se puede preguntar de
 * varias formas, tiene malas de sobra y ninguna buena se cuela entre las malas.
 */
import { describe, expect, it } from 'vitest'

import { BANK } from '../../src/modules/quiz/bank/index.js'
import { buildRound, OPTIONS, seeded } from '../../src/modules/quiz/quiz.rules.js'
import { SEEDED_SLUGS } from '../../src/modules/replica/curriculum.js'

// Sin espacios de más. Las mayúsculas cuentan: «ff» y «FF» son respuestas distintas.
const norm = (text: string): string => text.trim()

describe('banco de preguntas', () => {
  it('cada concepto tiene un id único', () => {
    const ids = BANK.map((concept) => concept.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(BANK.map((concept) => [concept.id, concept] as const))(
    '%s está bien hecho',
    (_, concept) => {
      expect(concept.forms.length).toBeGreaterThan(0)
      expect(concept.level).toBeGreaterThanOrEqual(1)
      expect(concept.level).toBeLessThanOrEqual(5)
      expect(concept.why.length).toBeGreaterThan(10)
      // Una pregunta larga es de razonar: lleva código o dura más.
      if (concept.kind === 'quick') expect(concept.seconds ?? 10).toBe(10)

      for (const form of concept.forms) {
        const wrong = [...concept.wrong, ...(form.wrong ?? [])].map(norm)

        expect(form.ask.length).toBeGreaterThan(0)
        expect(form.right.length).toBeGreaterThan(0)
        // Tres malas distintas como mínimo, para que cada vez salgan otras.
        expect(new Set(wrong).size).toBeGreaterThanOrEqual(OPTIONS - 1)
        // Ninguna buena entre las malas de su forma.
        expect(form.right.map(norm).filter((right) => wrong.includes(right))).toEqual([])
        expect(form.ask.every((ask) => ask.trim().length > 5)).toBe(true)
      }
    },
  )

  it('cada pregunta montada tiene cuatro respuestas distintas y una sola buena', () => {
    const random = seeded(42)

    for (const concept of BANK) {
      for (let take = 0; take < 20; take++) {
        const round = buildRound(concept, random)

        expect(round.options).toHaveLength(OPTIONS)
        expect(new Set(round.options.map(norm)).size).toBe(OPTIONS)
        expect(round.answer).toBeGreaterThanOrEqual(0)

        const form = concept.forms.find((candidate) => candidate.ask.includes(round.prompt))

        expect(form?.right).toContain(round.options[round.answer])
      }
    }
  })

  it('los proyectos que pide cada concepto existen (si no, no saldría nunca)', () => {
    const unknown = BANK.flatMap((concept) =>
      (concept.needs.projects ?? []).filter((slug) => !SEEDED_SLUGS.has(slug)),
    )

    expect(unknown).toEqual([])
  })

  it('hay preguntas de todo: rápidas y largas, generales y de proyecto', () => {
    expect(BANK.some((concept) => concept.kind === 'quick')).toBe(true)
    expect(BANK.some((concept) => concept.kind === 'long')).toBe(true)
    expect(BANK.some((concept) => Object.keys(concept.needs).length === 0)).toBe(true)
    expect(BANK.some((concept) => concept.needs.projects !== undefined)).toBe(true)
  })
})
