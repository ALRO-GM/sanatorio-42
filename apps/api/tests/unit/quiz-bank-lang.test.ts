/**
 * El banco de Not-games en inglés y en francés: cada concepto traducido tiene
 * la misma forma que el original (mismas formas, preguntas, buenas y malas, en
 * el mismo orden), porque una pregunta se monta por posiciones y luego se
 * enseña en el idioma de cada cual. Y cumple lo mismo que el español
 * (`quiz-bank.test.ts`): cada forma pregunta una sola cosa, los números van
 * con cifras, cada buena tiene malas de su misma pinta y ninguna buena se
 * cuela en la pregunta.
 */
import { describe, expect, it } from 'vitest'

import type { Lang } from '../../src/core/actor.js'
import { BANK, REVIEW } from '../../src/modules/quiz/bank/index.js'
import { BANK_EN } from '../../src/modules/quiz/bank/en/index.js'
import { REVIEW_EN } from '../../src/modules/quiz/bank/en/review.js'
import { BANK_FR } from '../../src/modules/quiz/bank/fr/index.js'
import { REVIEW_FR } from '../../src/modules/quiz/bank/fr/review.js'
import { localizeText, reviewIn } from '../../src/modules/quiz/bank/localize.js'
import type { ConceptText, ReviewEntry } from '../../src/modules/quiz/bank/types.js'
import {
  buildRound,
  localizeRound,
  OPTIONS,
  seeded,
  shapeOf,
} from '../../src/modules/quiz/quiz.rules.js'

// Sin espacios de más (tampoco los finos del francés). Las mayúsculas cuentan.
const norm = (text: string): string => text.replace(/[\u00a0\u202f]/g, ' ').trim()

/** Para comparar textos sin tildes, mayúsculas ni signos. */
const plain = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Un número escrito con letras como respuesta: se escribe con cifras, como en español. */
function numberWord(numeral: string, joiner: string, units: string, about: string): RegExp {
  return new RegExp(
    `^(${numeral}(${joiner}${numeral})*( (${units}))?|${numeral},.*|${about} \\d.*)$`,
    'i',
  )
}

const NUMBER_WORD: Record<Exclude<Lang, 'es'>, RegExp> = {
  en: numberWord(
    '(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|sixteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)',
    '(-| and | )',
    'bits|bytes|times',
    '(about|around)',
  ),
  fr: numberWord(
    '(zéro|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|seize|vingt|trente|quarante|cinquante|soixante|cent|mille)',
    '(-| et | )',
    'bits|octets|bytes|fois',
    '(environ|à peu près)',
  ),
}

/** Preguntas de elegir entre lo que dice el enunciado: ahí la buena sí sale en la pregunta. */
const CHOICE = new Set(['gfx-ray-sphere'])

const LANGS = [
  ['en', BANK_EN, REVIEW_EN],
  ['fr', BANK_FR, REVIEW_FR],
] as const satisfies readonly (readonly [
  Exclude<Lang, 'es'>,
  Readonly<Record<string, ConceptText>>,
  Readonly<Record<string, ReviewEntry>>,
])[]

/** Cuántas preguntas trae un texto, sin contar el código: una forma pregunta una sola cosa. */
const questions = (text: string): number => (text.replace(/`[^`]*`/g, '').match(/\?/g) ?? []).length

describe.each(LANGS)('banco de preguntas en %s', (lang, bank, review) => {
  it('está todo el banco, y nada más', () => {
    const ids = BANK.map((concept) => concept.id)

    expect(ids.filter((id) => bank[id] === undefined)).toEqual([])
    expect(Object.keys(bank).filter((id) => !ids.includes(id))).toEqual([])
  })

  it.each(BANK.map((concept) => [concept.id, concept] as const))(
    '%s tiene la misma forma',
    (id, concept) => {
      const other = bank[id]

      if (other === undefined) return

      expect(other.forms.length).toBe(concept.forms.length)
      expect(other.code === undefined || concept.code !== undefined, `${id}: code`).toBe(true)
      concept.forms.forEach((form, index) => {
        const target = other.forms[index]

        expect(target?.ask.length, `${id}#${String(index)} ask`).toBe(form.ask.length)
        expect(target?.right.length, `${id}#${String(index)} right`).toBe(form.right.length)
        expect(target?.wrong?.length ?? 0, `${id}#${String(index)} wrong`).toBe(
          form.wrong?.length ?? 0,
        )
        // Lo que es número, código o texto en español lo sigue siendo traducido.
        form.right.forEach((right, at) => {
          expect(shapeOf(target?.right[at] ?? ''), `${id}: «${right}»`).toBe(shapeOf(right))
        })
        ;(form.wrong ?? []).forEach((wrong, at) => {
          expect(shapeOf(target?.wrong?.[at] ?? ''), `${id}: «${wrong}»`).toBe(shapeOf(wrong))
        })
      })
      expect(other.wrong.length).toBe(concept.wrong.length)
      concept.wrong.forEach((wrong, at) => {
        expect(shapeOf(other.wrong[at] ?? ''), `${id}: «${wrong}»`).toBe(shapeOf(wrong))
      })
      expect(other.why.length).toBeGreaterThan(10)
    },
  )

  it.each(BANK.map((concept) => [concept.id, concept] as const))(
    '%s cumple las reglas del banco',
    (id) => {
      const other = bank[id]

      if (other === undefined) return

      other.forms.forEach((form) => {
        const wrong = [...other.wrong, ...(form.wrong ?? [])].map(norm)

        // Sin espacios (tampoco duros) en los bordes: «;» con un espacio delante ya no es «;».
        for (const text of [...form.ask, ...form.right, ...other.wrong, ...(form.wrong ?? [])]) {
          expect(text, `${id}: «${text}»`).toBe(text.trim())
        }

        for (const ask of form.ask) {
          expect(norm(ask).length, `${id}: «${ask}»`).toBeGreaterThan(5)
          // Una sola pregunta por texto, como en el original.
          expect(questions(ask), `${id}: «${ask}»`).toBeLessThanOrEqual(1)
        }
        // Ninguna buena entre las malas de su forma.
        expect(
          form.right.map(norm).filter((right) => wrong.includes(right)),
          id,
        ).toEqual([])

        for (const right of form.right) {
          const alike = new Set(wrong.filter((each) => shapeOf(each) === shapeOf(right)))

          expect(
            alike.size,
            `${id}: «${right}» no tiene tres malas como ella`,
          ).toBeGreaterThanOrEqual(OPTIONS - 1)
          expect(NUMBER_WORD[lang].test(norm(right)), `${id}: «${right}»`).toBe(false)

          if (!CHOICE.has(id)) {
            for (const ask of form.ask) {
              expect(
                plain(right).length >= 3 && ` ${plain(ask)} `.includes(` ${plain(right)} `),
                `${id}: «${ask}» trae «${right}»`,
              ).toBe(false)
            }
          }
        }
        for (const each of wrong) {
          expect(NUMBER_WORD[lang].test(each), `${id}: «${each}»`).toBe(false)
        }
      })
    },
  )

  it('el Repaso está entero', () => {
    expect(Object.keys(review).sort()).toEqual(Object.keys(REVIEW).sort())
    for (const [id, entry] of Object.entries(review)) {
      expect(entry.title.length, id).toBeGreaterThan(2)
      expect(entry.title.length, id).toBeLessThanOrEqual(60)
      expect(entry.definition.length, id).toBeGreaterThan(40)
      expect(entry.example.length, id).toBeGreaterThan(5)
    }
  })

  // Se traduce texto a texto: si un mismo texto en español tuviera dos
  // traducciones, la segunda no se vería nunca.
  it.each(BANK.map((concept) => [concept.id, concept] as const))(
    '%s traduce cada texto de una sola manera',
    (id, concept) => {
      const other = bank[id]
      const seen = new Map<string, string>()
      const pair = (from: readonly string[] = [], to: readonly string[] = []): void => {
        from.forEach((text, at) => {
          const translated = to[at] ?? ''

          expect(seen.get(text) ?? translated, `${id}: «${text}»`).toBe(translated)
          seen.set(text, translated)
        })
      }

      concept.forms.forEach((form, index) => {
        pair(form.ask, other?.forms[index]?.ask)
        pair(form.right, other?.forms[index]?.right)
        pair(form.wrong, other?.forms[index]?.wrong)
      })
      pair(concept.wrong, other?.wrong)
    },
  )

  it('una ronda montada se enseña traducida, con la buena en su sitio', () => {
    const concept = BANK.find((each) => each.id === 'net-dns')

    if (concept === undefined) throw new Error('falta net-dns')

    for (let seed = 1; seed <= 20; seed++) {
      const round = buildRound(concept, seeded(seed))
      const shown = localizeRound(round, lang)

      expect(shown.options).toHaveLength(round.options.length)
      expect(shown.prompt).not.toBe(round.prompt)
      expect(shown.why).toBe(bank['net-dns']?.why)
      expect(localizeRound(round, 'es')).toBe(round)
      // La buena sigue en la misma posición, ya traducida.
      expect(shown.options[shown.answer]).toBe(
        localizeText('net-dns', round.options[round.answer] ?? '', lang),
      )
    }
  })

  it('el Repaso sale en su idioma', () => {
    expect(reviewIn('net-dns', lang, REVIEW)).toBe(review['net-dns'])
    expect(reviewIn('net-dns', 'es', REVIEW)).toBe(REVIEW['net-dns'])
  })
})

describe('banco de preguntas en francés', () => {
  it('cada texto francés está en francés, no en inglés ni en español', () => {
    // Un concepto copiado sin traducir: su porqué es el mismo que en otro idioma.
    const copied = BANK.filter(
      (concept) =>
        BANK_FR[concept.id]?.why === BANK_EN[concept.id]?.why ||
        BANK_FR[concept.id]?.why === concept.why,
    ).map((concept) => concept.id)

    expect(copied).toEqual([])
  })

  it('lo que no se conoce se queda como estaba', () => {
    const concept = BANK.find((each) => each.id === 'net-dns')

    if (concept === undefined) throw new Error('falta net-dns')
    // Una ronda guardada con un texto que el francés no conoce se queda como está.
    expect(localizeText('net-dns', 'texto que no existe', 'fr')).toBe('texto que no existe')
    expect(localizeText('no-existe', concept.why, 'fr')).toBe(concept.why)
  })
})
