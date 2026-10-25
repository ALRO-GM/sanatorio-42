/**
 * Quién va más rápido en el common core (antes «ritmo» en las estadísticas de
 * Ayuda; desde el 2026-10-25, en el Avance). Sin base ni red.
 *
 * Entra la gente del campus que sigue en el common core o lo terminó
 * (`docs/blackhole.md`): nunca a quien se tragó el black hole, ni a quien no se
 * sabe. Se ordena por el círculo en el que está, por el % hecho por círculos o
 * por el % de horas (sobre las de su propio plan), y se filtra por plan, por
 * kickoff (el mes en que entró) y por rangos de círculo y de %.
 */

import type { CoreTrack, RankingBy, RankingEntry } from '@sanatorio/contracts'

/** Alguien que puede salir en la clasificación. */
export type Runner = Omit<RankingEntry, 'rank'> & {
  /** El mes en que entró, `AAAA-MM`. */
  kickoff: string
}

export type RankingFilters = {
  by: RankingBy
  plan: CoreTrack | 'all'
  /** `AAAA-MM`, o `null` para todo el mundo. */
  kickoff: string | null
  /** `only`: solo ese kickoff; `since`: ese y los siguientes. */
  cohort: 'only' | 'since'
  circleMin: number
  circleMax: number
  /** Rango del % de lo que ordena (el de círculos si se ordena por círculo). */
  pctMin: number
  pctMax: number
}

/** El % con el que se filtra y desempata: el de horas si se ordena por horas; si no, el de círculos. */
const pctOf = (runner: Runner, by: RankingBy): number =>
  by === 'hours' ? runner.hours : runner.circles

/** Lo que ordena, de más importante a menos. Mismas cifras, mismo puesto. */
function keyOf(runner: Runner, by: RankingBy): number[] {
  if (by === 'circle') return [runner.circle, runner.circles, runner.hours]
  if (by === 'circles') return [runner.circles, runner.hours]

  return [runner.hours, runner.circles]
}

/** Los que pasan los filtros, ordenados y con su puesto. */
export function rankRunners(runners: readonly Runner[], filters: RankingFilters): RankingEntry[] {
  const kept = runners.filter((runner) => {
    const pct = pctOf(runner, filters.by)

    return (
      (filters.plan === 'all' || runner.track === filters.plan) &&
      (filters.kickoff === null ||
        (filters.cohort === 'only'
          ? runner.kickoff === filters.kickoff
          : runner.kickoff >= filters.kickoff)) &&
      runner.circle >= filters.circleMin &&
      runner.circle <= filters.circleMax &&
      pct >= filters.pctMin &&
      pct <= filters.pctMax
    )
  })
  const keyed = kept.map((runner) => ({ runner, key: keyOf(runner, filters.by) }))

  keyed.sort((a, b) => {
    for (let index = 0; index < a.key.length; index++) {
      const diff = (b.key[index] ?? 0) - (a.key[index] ?? 0)

      if (diff !== 0) return diff
    }

    return a.runner.login.localeCompare(b.runner.login)
  })

  const entries: RankingEntry[] = []

  keyed.forEach(({ runner, key }, index) => {
    const previous = keyed[index - 1]
    const tie = previous?.key.every((value, at) => value === key[at]) === true
    // El kickoff no sale: solo lo que ya enseñaba la clasificación.
    entries.push({
      rank: tie ? (entries[index - 1]?.rank ?? index + 1) : index + 1,
      login: runner.login,
      image: runner.image,
      track: runner.track,
      circle: runner.circle,
      circles: runner.circles,
      hours: runner.hours,
    })
  })

  return entries
}

/** Los kickoffs con su gente, del más reciente al más antiguo. */
export function kickoffsOf(runners: readonly Runner[]): { month: string; people: number }[] {
  const counts = new Map<string, number>()

  for (const runner of runners) counts.set(runner.kickoff, (counts.get(runner.kickoff) ?? 0) + 1)

  return [...counts]
    .map(([month, people]) => ({ month, people }))
    .sort((a, b) => b.month.localeCompare(a.month))
}
