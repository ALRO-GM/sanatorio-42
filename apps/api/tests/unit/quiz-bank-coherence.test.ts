/**
 * Coherencia del banco de Not-games: que ninguna pregunta se pueda acertar sin
 * saber nada. Las reglas completas están en `docs/preguntas.md`; aquí se
 * comprueban las que se pueden ver solas:
 *
 * - las buenas de una forma tienen todas la misma pinta (`shapeOf`), para que
 *   las malas que salen con ellas sean siempre del mismo tipo;
 * - si se pregunta «¿cuántos…?», la buena es una cantidad;
 * - la buena no es mucho más larga (ni mucho más corta) que las malas que
 *   pueden salir con ella: la más larga no puede ser siempre la buena;
 * - dos conceptos no hacen la misma pregunta (salvo «¿qué imprime?» con su
 *   código);
 * - y la piscina tiene preguntas de cada módulo, que le salen a quien está en
 *   ella.
 *
 * Lo de que la buena no venga escrita en la pregunta y que haya tres malas de
 * su pinta ya lo miran `quiz-bank.test.ts` y `quiz-bank-lang.test.ts`.
 */
import { describe, expect, it } from 'vitest'

import { BANK } from '../../src/modules/quiz/bank/index.js'
import { BANK_EN } from '../../src/modules/quiz/bank/en/index.js'
import { BANK_FR } from '../../src/modules/quiz/bank/fr/index.js'
import type { ConceptText } from '../../src/modules/quiz/bank/types.js'
import { fits, OPTIONS, pickConcepts, seeded, shapeOf } from '../../src/modules/quiz/quiz.rules.js'
import { PISCINE_PROGRESS } from '../../src/modules/replica/piscine.js'

/** Las malas que de verdad pueden salir con una buena, como las elige `buildRound`. */
function poolFor(text: ConceptText, form: ConceptText['forms'][number], right: string): string[] {
  const shape = shapeOf(right)
  const alike = (list: readonly string[] = []): string[] =>
    list.filter((each) => shapeOf(each) === shape)
  const own = alike(form.wrong)

  return [...new Set(own.length >= OPTIONS - 1 ? own : [...own, ...alike(text.wrong)])]
}

/** Cuánto más larga (o más corta) que la media de sus malas puede ser una buena. */
const LONGER = 2
const SHORTER = 3

/** Por debajo de esto, la longitud no delata nada («int», «NULL», «fd[0]»). */
const SHORT_TEXT = 12

/** «¿Cuántos…?» se contesta con un número o con una cantidad dicha con palabras («Uno por columna»). */
const COUNT_ASK = /¿\s*cu[aá]nt[oa]s\b|\bhow many\b|\bcombien\b/i
const COUNT_WORDS =
  /^(un[oa]?|tant[oa]s|ningun[oa]|tod[oa]s|nunca|infinit|one|as many|none|no |never|all|une?|autant|aucun|jamais|tou[st])/i

const LANGS = [
  ['es', Object.fromEntries(BANK.map((concept) => [concept.id, concept]))],
  ['en', BANK_EN],
  ['fr', BANK_FR],
] as const satisfies readonly (readonly [string, Readonly<Record<string, ConceptText>>])[]

describe.each(LANGS)('coherencia del banco en %s', (_, bank) => {
  it.each(BANK.map((concept) => [concept.id] as const))('%s no se acierta sin saber', (id) => {
    const text = bank[id]

    if (text === undefined) return

    text.forms.forEach((form, index) => {
      const where = `${id}#${String(index)}`

      // Todas las buenas de una forma, de la misma pinta: número, código o texto.
      expect(new Set(form.right.map(shapeOf)).size, `${where}: buenas de pintas distintas`).toBe(1)

      for (const right of form.right) {
        const pool = poolFor(text, form, right)

        if (form.ask.some((ask) => COUNT_ASK.test(ask))) {
          expect(
            shapeOf(right) === 'number' || COUNT_WORDS.test(right),
            `${where}: pregunta una cantidad y la buena es «${right}»`,
          ).toBe(true)
        }

        if (shapeOf(right) === 'number' || right.length < SHORT_TEXT) continue

        const average = pool.reduce((sum, each) => sum + each.length, 0) / pool.length

        expect(
          right.length,
          `${where}: «${right}» es mucho más larga que sus malas (media ${average.toFixed(0)})`,
        ).toBeLessThanOrEqual(LONGER * average)
        expect(
          right.length * SHORTER,
          `${where}: «${right}» es mucho más corta que sus malas (media ${average.toFixed(0)})`,
        ).toBeGreaterThanOrEqual(average)
      }
    })
  })
})

describe('coherencia del banco', () => {
  it('dos conceptos no hacen la misma pregunta, salvo sobre su propio código', () => {
    const seen = new Map<string, string>()
    const repeated: string[] = []

    for (const concept of BANK) {
      if (concept.code !== undefined) continue
      for (const ask of concept.forms.flatMap((form) => form.ask)) {
        const other = seen.get(ask)

        if (other !== undefined && other !== concept.id)
          repeated.push(`${concept.id} y ${other}: «${ask}»`)
        seen.set(ask, concept.id)
      }
    }

    expect(repeated).toEqual([])
  })
})

describe('preguntas de la piscina', () => {
  const steps = PISCINE_PROGRESS.map((project) => project.slug)
  const piscine = BANK.filter(
    (concept) => concept.needs.projects?.every((slug) => steps.includes(slug)) === true,
  )

  it('hay al menos cien, y cada módulo de shell y de C tiene las suyas', () => {
    expect(piscine.length).toBeGreaterThanOrEqual(100)

    for (const step of steps) {
      // El primer slug que pide es el módulo en que se ve.
      const own = piscine.filter((concept) => concept.needs.projects?.[0] === step)

      expect(own.length, step).toBeGreaterThanOrEqual(4)
    }
  })

  it('le salen a quien va por ese módulo o por uno de después, y a nadie más', () => {
    const shellOnly = { slugs: new Set(['c-piscine-shell-00']) }
    const lastC = { slugs: new Set(['c-piscine-c-13']) }
    const student = { slugs: new Set(['42cursus-libft', '42cursus-ft_printf']) }

    for (const concept of piscine) {
      const first = concept.needs.projects?.[0] ?? ''

      expect(fits(concept, lastC), concept.id).toBe(true)
      expect(fits(concept, shellOnly), concept.id).toBe(first === 'c-piscine-shell-00')
      expect(fits(concept, student), concept.id).toBe(false)
    }
  })

  it('una partida de piscineros sale entera de la piscina y de lo general', () => {
    const learners = [
      { slugs: new Set(['c-piscine-c-04']) },
      { slugs: new Set(['c-piscine-c-02']) },
    ]
    const chosen = pickConcepts(
      BANK,
      learners,
      { pool: 'common', kinds: 'mixed', difficulty: 'rising', levels: new Map(), count: 40 },
      seeded(7),
    )

    expect(chosen).toHaveLength(40)
    for (const concept of chosen) {
      expect(concept.needs.projects === undefined || piscine.includes(concept), concept.id).toBe(
        true,
      )
      expect(concept.needs.lang === undefined || concept.needs.lang === 'c', concept.id).toBe(true)
    }
  })
})
