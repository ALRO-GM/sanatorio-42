/**
 * Estadísticas de Ayuda: lo que se mueve en el campus en cada sección y quién
 * más lo mueve. Mismo criterio que la clasificación de XP: periodo de este mes
 * o de siempre, empates con el mismo puesto y, aparte, el puesto de quien mira.
 * Quién va más rápido en el curso está en el Avance (`ranking.rules.ts`).
 */

import type { HelpStats, LeaderboardPeriod, StatsEntry, StatsSection } from '@sanatorio/contracts'

import type { Actor } from '../../core/actor.js'
import type { RankRow, StatsRepository } from './stats.repository.js'
import { STATS_SECTIONS } from './stats.repository.js'

/** Puestos que se enseñan de cada clasificación. */
const TOP = 10

/** Pone puesto a cada fila (quien empata en las dos cifras comparte puesto). */
export function ranked(rows: readonly RankRow[]): StatsEntry[] {
  const entries: StatsEntry[] = []

  for (const [index, row] of rows.entries()) {
    const previous = entries[index - 1]
    const tie = previous?.value === row.value && previous.extra === row.extra

    entries.push({ ...row, rank: tie ? previous.rank : index + 1 })
  }

  return entries
}

export function createStatsService(options: { stats: StatsRepository; now?: () => number }) {
  const { stats } = options
  const now = options.now ?? Date.now

  return {
    async help(actor: Actor, period: LeaderboardPeriod): Promise<HelpStats> {
      const date = new Date(now())
      const since =
        period === 'month'
          ? new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString()
          : null
      const at = date.toISOString()

      const sections = await Promise.all(
        STATS_SECTIONS.map(async (id): Promise<StatsSection> => {
          const [totals, { top, me }] = await Promise.all([
            stats.totals(id, actor.campusId, since, at),
            stats.ranking(id, actor.campusId, since, at, TOP, actor.login),
          ])
          const entries = ranked(top)

          return {
            id,
            totals,
            ranking: entries,
            me: entries.find((entry) => entry.login === actor.login) ?? me,
          }
        }),
      )

      return { period, sections }
    },
  }
}

export type StatsService = ReturnType<typeof createStatsService>
