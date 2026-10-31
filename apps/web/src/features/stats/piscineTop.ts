/**
 * Lo de la vista sin límites del dueño en el Avance de la piscina
 * (`docs/piscineros.md`): la piscina ordenada de más a menos avanzada, el
 * percentil de cada cual, la media de los mejores y quién cae entre dos
 * percentiles. Todo en la web, con la línea de cada uno que trae la API
 * (`PiscineProgress.everyone`).
 */

import type { PiscineProgress, ProgressLine } from '@sanatorio/contracts'

export type Swimmer = NonNullable<PiscineProgress['everyone']>[number]

/** Un piscinero en la lista: su puesto y su percentil (100: el mejor). */
export type Ranked = Swimmer & { rank: number; percentile: number; lastDay: number | null }

/** El día en que aprobó lo último que lleva; `null` sin nada aprobado. */
const lastDayOf = (swimmer: Swimmer): number | null => swimmer.milestones.at(-1)?.day ?? null

/**
 * De más a menos avanzado: más proyectos aprobados y, a igualdad, quien llegó
 * antes. Quien empata en las dos cosas comparte puesto. El percentil es la
 * parte de la piscina que va igual o por detrás (100: el primero).
 */
export function rankPool(everyone: readonly Swimmer[]): Ranked[] {
  const sorted = [...everyone].sort(
    (a, b) =>
      b.done - a.done ||
      (lastDayOf(a) ?? Infinity) - (lastDayOf(b) ?? Infinity) ||
      a.login.localeCompare(b.login),
  )
  const n = sorted.length
  let rank = 0
  /** El de antes en la lista: quien empata con él comparte puesto. */
  let before: Swimmer | null = null

  return sorted.map((swimmer, index) => {
    const tied =
      before !== null && before.done === swimmer.done && lastDayOf(before) === lastDayOf(swimmer)

    if (!tied) rank = index + 1
    before = swimmer

    return {
      ...swimmer,
      rank,
      percentile: Math.round(((n - rank + 1) / n) * 100),
      lastDay: lastDayOf(swimmer),
    }
  })
}

/** Los mejores `percent` % de la piscina (como poco uno, si hay alguien). */
export function bestOf(ranked: readonly Ranked[], percent: number): Ranked[] {
  if (ranked.length === 0) return []

  return ranked.slice(0, Math.max(1, Math.ceil((percent / 100) * ranked.length)))
}

/** Quien tiene su percentil entre `low` y `high` (los dos incluidos). */
export function between(ranked: readonly Ranked[], low: number, high: number): Ranked[] {
  return ranked.filter((each) => each.percentile >= low && each.percentile <= high)
}

/** La media de esas líneas punto a punto, con un decimal; donde nadie tiene dato, `null`. */
export function meanOf(lines: readonly ProgressLine[], length: number): ProgressLine {
  return Array.from({ length }, (_, index) => {
    const values = lines.flatMap((line) => {
      const value = line[index]

      return value === null || value === undefined ? [] : [value]
    })

    return values.length === 0
      ? null
      : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
  })
}
