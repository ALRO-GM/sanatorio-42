/**
 * El banco de Not-games está bien hecho: cada concepto se puede preguntar de
 * varias formas, tiene malas de sobra y ninguna buena se cuela entre las malas.
 */
import { describe, expect, it } from 'vitest'

import { BANK, REVIEW } from '../../src/modules/quiz/bank/index.js'
import { buildRound, OPTIONS, seeded, shapeOf } from '../../src/modules/quiz/quiz.rules.js'
import { SEEDED_SLUGS } from '../../src/modules/replica/curriculum.js'

// Sin espacios de más. Las mayúsculas cuentan: «ff» y «FF» son respuestas distintas.
const norm = (text: string): string => text.trim()

/** Para comparar textos sin tildes, mayúsculas ni signos. */
const plain = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Un número escrito con letras como respuesta («Ocho», «Uno, siempre», «Unos 10»): se escribe con cifras. */
const NUMERAL =
  '(cero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|dieciséis|veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|doscientos|mil)'
const NUMBER_WORD = new RegExp(
  `^(${NUMERAL}( y ${NUMERAL}| ${NUMERAL})*( (bits|bytes|veces))?|${NUMERAL},.*|unos? \\d.*)$`,
  'i',
)

/**
 * Preguntas de elegir entre lo que dice el enunciado: ahí la buena sí sale en
 * la pregunta, y es lo que se pide.
 */
const CHOICE = new Set(['gfx-ray-sphere'])

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

        for (const right of form.right) {
          // Tres malas con la pinta de la buena: números con números, código con código.
          const alike = new Set(wrong.filter((each) => shapeOf(each) === shapeOf(right)))

          expect(
            alike.size,
            `${concept.id}: «${right}» no tiene tres malas como ella`,
          ).toBeGreaterThanOrEqual(OPTIONS - 1)
          // Los números, con cifras: si no, la buena se distingue de las malas.
          expect(NUMBER_WORD.test(right.trim()), `${concept.id}: «${right}»`).toBe(false)

          // La buena no puede venir escrita en la pregunta.
          if (!CHOICE.has(concept.id)) {
            for (const ask of form.ask) {
              expect(
                plain(right).length >= 3 && ` ${plain(ask)} `.includes(` ${plain(right)} `),
                `${concept.id}: «${ask}» trae «${right}»`,
              ).toBe(false)
            }
          }
        }
        for (const each of wrong) {
          expect(NUMBER_WORD.test(each.trim()), `${concept.id}: «${each}»`).toBe(false)
        }
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

  it('cada concepto tiene su repaso (título, definición y ejemplo), y no sobra ninguno', () => {
    const ids = new Set(BANK.map((concept) => concept.id))

    expect(BANK.filter((concept) => REVIEW[concept.id] === undefined).map((c) => c.id)).toEqual([])
    expect(Object.keys(REVIEW).filter((id) => !ids.has(id))).toEqual([])
    for (const entry of Object.values(REVIEW)) {
      expect(entry.title.length).toBeGreaterThan(2)
      expect(entry.title.length).toBeLessThanOrEqual(60)
      expect(entry.definition.length).toBeGreaterThan(40)
      expect(entry.example.length).toBeGreaterThan(5)
    }
  })

  it('hay preguntas de todo: rápidas y largas, generales y de proyecto', () => {
    expect(BANK.some((concept) => concept.kind === 'quick')).toBe(true)
    expect(BANK.some((concept) => concept.kind === 'long')).toBe(true)
    expect(BANK.some((concept) => Object.keys(concept.needs).length === 0)).toBe(true)
    expect(BANK.some((concept) => concept.needs.projects !== undefined)).toBe(true)
  })
})
