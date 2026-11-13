/**
 * De las puntuaciones a una lista ordenada: los mejores de cada buscador, la
 * fusión de dos listas por rangos (RRF) y el reordenado de los primeros.
 */

import { LIMITS } from './limits.js'

/** Un trozo en una lista: su sitio en el índice y su puntuación. */
export type Scored = { at: number; score: number }

/** Los de puntuación mayor que cero, de más a menos (a igualdad, el que va antes en el corpus). */
export function ranked(scores: readonly number[], top: number = LIMITS.candidates): Scored[] {
  return scores
    .map((score, at) => ({ at, score }))
    .filter((each) => each.score > 0)
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, top)
}

export type Fused = Scored & { lexical: number | null; semantic: number | null }

/** Lo que aporta un puesto en RRF: `1 / (k + puesto)`; quien no está en la lista, nada. */
export const rrfTerm = (k: number, rank: number | null): number =>
  rank === null ? 0 : 1 / (k + rank)

/**
 * Fusión por rangos recíprocos (RRF). No mira las puntuaciones (las de BM25 y
 * los cosenos no se pueden comparar), solo el puesto en cada lista. Con
 * `weight` 0,5 es el RRF de siempre, `1/(k + puesto léxico) + 1/(k + puesto
 * semántico)`; hacia 1 manda la lista semántica y hacia 0, la léxica.
 */
export function rrf(
  lexical: readonly Scored[],
  semantic: readonly Scored[],
  weight: number,
  k: number,
): Fused[] {
  const rankIn = (list: readonly Scored[], at: number): number | null => {
    const index = list.findIndex((each) => each.at === at)

    return index < 0 ? null : index + 1
  }
  const all = [...new Set([...lexical, ...semantic].map((each) => each.at))]

  return all
    .map((at) => {
      const lex = rankIn(lexical, at)
      const sem = rankIn(semantic, at)

      return {
        at,
        lexical: lex,
        semantic: sem,
        score: 2 * ((1 - weight) * rrfTerm(k, lex) + weight * rrfTerm(k, sem)),
      }
    })
    .filter((each) => each.score > 0)
    .sort((a, b) => b.score - a.score || a.at - b.at)
}

/**
 * Reordenado: los `depth` primeros se vuelven a puntuar con algo más caro que
 * lee la pregunta y el trozo juntos (`score`), y se recolocan; el resto se
 * queda detrás, como estaba.
 */
export function rerank(
  list: readonly Scored[],
  depth: number,
  score: (at: number) => number,
): Scored[] {
  const head = list
    .slice(0, depth)
    .map((each, order) => ({ at: each.at, score: score(each.at), order }))
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(({ at, score: value }) => ({ at, score: value }))

  return [...head, ...list.slice(depth)]
}
