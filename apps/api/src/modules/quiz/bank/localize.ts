/**
 * Las preguntas en el idioma de quien las mira.
 *
 * Una ronda se monta y se guarda en español; al enseñarla se traduce texto a
 * texto. Cada concepto traducido tiene la misma forma que el original (lo
 * comprueba `tests/unit/quiz-bank-lang.test.ts`), así que lo que está en una
 * posición del español se traduce por lo que está en la misma posición del
 * otro idioma. Lo que falta en francés sale en
 * inglés; lo que no se encuentra en ninguno (un concepto sin traducir, o una
 * ronda guardada antes de cambiar el texto) se queda como estaba.
 */

import type { Lang } from '../../../core/actor.js'
import { BANK_EN } from './en/index.js'
import { REVIEW_EN } from './en/review.js'
import { BANK_FR } from './fr/index.js'
import { REVIEW_FR } from './fr/review.js'
import { BANK } from './index.js'
import type { Concept, ConceptText, ReviewEntry } from './types.js'

/** Cada idioma con su traducción y la de reserva, por orden: lo último manda. */
const LAYERS: Record<Exclude<Lang, 'es'>, readonly Readonly<Record<string, ConceptText>>[]> = {
  en: [BANK_EN],
  fr: [BANK_EN, BANK_FR],
}

const SPANISH = new Map(BANK.map((concept) => [concept.id, concept]))
const tables = new Map<string, Map<string, string>>()

/** Cada texto en español del concepto, con su traducción en la misma posición. */
function tableOf(concept: Concept, other: ConceptText): Map<string, string> {
  const table = new Map<string, string>()
  const pair = (from: readonly string[] = [], to: readonly string[] = []): void => {
    from.forEach((text, index) => {
      const translated = to[index]

      if (translated !== undefined && !table.has(text)) table.set(text, translated)
    })
  }

  concept.forms.forEach((form, index) => {
    const target = other.forms[index]

    pair(form.ask, target?.ask)
    pair(form.right, target?.right)
    pair(form.wrong, target?.wrong)
  })
  pair(concept.wrong, other.wrong)
  pair([concept.why], [other.why])

  return table
}

function translator(conceptId: string, lang: Lang): ((text: string) => string) | null {
  if (lang === 'es') return null

  const concept = SPANISH.get(conceptId)

  if (concept === undefined || LAYERS[lang].every((layer) => layer[conceptId] === undefined)) {
    return null
  }

  const key = `${lang}:${conceptId}`
  let table = tables.get(key)

  if (table === undefined) {
    // Primero la reserva y encima la traducción: un texto que falte en
    // francés se queda en inglés.
    table = new Map(
      LAYERS[lang].flatMap((layer) => {
        const other = layer[conceptId]

        return other === undefined ? [] : [...tableOf(concept, other)]
      }),
    )
    tables.set(key, table)
  }

  const found = table

  return (text) => found.get(text) ?? text
}

/** Lo que se traduce de una ronda; el resto de sus campos pasa tal cual. */
type Localizable = {
  conceptId: string
  prompt: string
  code: string | null
  options: readonly string[]
  why: string
}

/** Una ronda en el idioma pedido. Las opciones siguen en el mismo orden. */
export function localizeRound<T extends Localizable>(round: T, lang: Lang): T {
  const text = translator(round.conceptId, lang)

  if (text === null) return round

  const code =
    lang === 'es'
      ? undefined
      : LAYERS[lang].reduce<string | undefined>(
          (found, layer) => layer[round.conceptId]?.code ?? found,
          undefined,
        )

  return {
    ...round,
    prompt: text(round.prompt),
    code: round.code !== null && code !== undefined ? code : round.code,
    options: round.options.map(text),
    why: text(round.why),
  }
}

/** Un texto suelto de un concepto (una pregunta, su porqué) en el idioma pedido. */
export function localizeText(conceptId: string, text: string, lang: Lang): string {
  return translator(conceptId, lang)?.(text) ?? text
}

/** El repaso de un concepto en el idioma pedido; si no está traducido, el de `spanish`. */
export function reviewIn(
  conceptId: string,
  lang: Lang,
  spanish: Readonly<Record<string, ReviewEntry>> | undefined,
): ReviewEntry | undefined {
  const fallback = lang === 'es' ? undefined : REVIEW_EN[conceptId]

  return (lang === 'fr' ? REVIEW_FR[conceptId] : undefined) ?? fallback ?? spanish?.[conceptId]
}
