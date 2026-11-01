/**
 * Lo bien que separan unos pesos a la gente en grupos (`docs/asientos.md`),
 * para comparar pesos en el panel. La cifra principal es la modularidad: la
 * parte de la cercanía que queda dentro de los grupos menos la que quedaría
 * por azar con la misma cercanía por persona. Cuanto más alta, más nítidos.
 */

import type { SeatGroupQuality } from '@sanatorio/contracts'

type Pair = { a: string; b: string; closeness: number }

const round3 = (value: number): number => Math.round(value * 1000) / 1000

/**
 * La calidad de un reparto en grupos. `community` da el grupo de cada persona
 * de `people`; las parejas son las que unen en el grafo.
 */
export function groupQuality(
  people: readonly string[],
  pairs: readonly Pair[],
  community: ReadonlyMap<string, number>,
): SeatGroupQuality {
  const size = new Map<number, number>()

  for (const login of people) {
    const group = community.get(login)

    if (group !== undefined) size.set(group, (size.get(group) ?? 0) + 1)
  }

  const total = pairs.reduce((sum, pair) => sum + pair.closeness, 0)
  const degree = new Map<number, number>()
  let inside = 0

  for (const pair of pairs) {
    const a = community.get(pair.a)
    const b = community.get(pair.b)

    if (a !== undefined) degree.set(a, (degree.get(a) ?? 0) + pair.closeness)
    if (b !== undefined) degree.set(b, (degree.get(b) ?? 0) + pair.closeness)
    if (a !== undefined && a === b) inside += pair.closeness
  }

  const modularity =
    total === 0
      ? 0
      : inside / total -
        [...degree.values()].reduce((sum, value) => sum + (value / (2 * total)) ** 2, 0)
  const groups = [...size.values()].filter((count) => count > 1)
  const grouped = groups.reduce((sum, count) => sum + count, 0)
  const share = (count: number): number => (people.length === 0 ? 0 : round3(count / people.length))

  return {
    modularity: round3(modularity),
    communities: groups.length,
    grouped: share(grouped),
    inside: total === 0 ? 0 : round3(inside / total),
    largest: share(Math.max(0, ...groups)),
    pairs: pairs.length,
  }
}
