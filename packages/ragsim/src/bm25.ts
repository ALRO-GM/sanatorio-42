/**
 * Búsqueda léxica: BM25 sobre los tokens de cada trozo. Las tres piezas se
 * pueden pedir sueltas para calcularlas a mano en el curso:
 *
 * - **TF**: cuántas veces sale el término en el trozo.
 * - **IDF**: cuánto distingue: `ln(1 + (N − df + 0,5) / (df + 0,5))`, con `N`
 *   trozos y `df` trozos que lo contienen. Un término que está en todos casi
 *   no puntúa.
 * - **BM25**: la suma, por término de la consulta, de
 *   `idf × tf × (k1 + 1) / (tf + k1 × (1 − b + b × largo / largo medio))`.
 *   `k1` dice cuánto sigue sumando repetir el término (con 0, da igual una
 *   vez que diez) y `b` cuánto se castiga a los trozos largos (con 0, nada).
 */

import type { Chunk } from './chunk.js'
import { tokenize } from './text.js'
import type { TokenOptions } from './text.js'

type Bm25Params = { k1: number; b: number }

export type LexicalIndex = {
  options: TokenOptions
  /** Por trozo (en el orden de `chunks`): cuántas veces sale cada término. */
  tf: Map<string, number>[]
  /** En cuántos trozos sale cada término. */
  df: Map<string, number>
  lengths: number[]
  average: number
}

export function buildLexical(chunks: readonly Chunk[], options: TokenOptions): LexicalIndex {
  const df = new Map<string, number>()
  const lengths: number[] = []
  const tf = chunks.map((chunk) => {
    const counts = new Map<string, number>()
    const tokens = tokenize(chunk.text, options)

    for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1)
    for (const token of counts.keys()) df.set(token, (df.get(token) ?? 0) + 1)
    lengths.push(tokens.length)

    return counts
  })
  const total = lengths.reduce((sum, length) => sum + length, 0)

  return { options, tf, df, lengths, average: lengths.length === 0 ? 0 : total / lengths.length }
}

/** El IDF de un término ya tokenizado. */
export function idf(index: LexicalIndex, term: string): number {
  const df = index.df.get(term) ?? 0

  return Math.log(1 + (index.tf.length - df + 0.5) / (df + 0.5))
}

/** La puntuación BM25 de cada trozo para una consulta (0: no comparte ningún término). */
export function bm25(index: LexicalIndex, query: string, params: Bm25Params): number[] {
  const terms = [...new Set(tokenize(query, index.options))]

  return index.tf.map((counts, at) => {
    const norm =
      1 - params.b + params.b * (index.average === 0 ? 0 : (index.lengths[at] ?? 0) / index.average)
    let score = 0

    for (const term of terms) {
      const tf = counts.get(term) ?? 0

      if (tf > 0) score += (idf(index, term) * tf * (params.k1 + 1)) / (tf + params.k1 * norm)
    }

    return score
  })
}
