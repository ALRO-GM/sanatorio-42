/**
 * Estadísticas de Ayuda: lo que se mueve en el campus en cada sección y quién
 * más lo mueve. Mismo criterio que la clasificación de XP: periodo de este mes
 * o de siempre, empates con el mismo puesto y, aparte, el puesto de quien mira.
 */

import type { HelpStats, LeaderboardPeriod, StatsEntry, StatsSection } from '@sanatorio/contracts'

import type { Actor } from '../../core/actor.js'
import { paceOf } from './pace.rules.js'
import type { PaceRepository, RankRow, StatsRepository } from './stats.repository.js'
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

export function createStatsService(options: {
  stats: StatsRepository
  paces?: PaceRepository
  now?: () => number
}) {
  const { stats } = options
  const now = options.now ?? Date.now

  /**
   * Quién va más rápido en el curso (#79 del buzón): de pace más rápido a más
   * lento y, al mismo pace, quien lleva más. `value` es el % del curso;
   * `extra`, el pace en meses (0 si va más lento que 24). No depende del
   * periodo: el ritmo se mide desde que empezaste.
   */
  async function pace(actor: Actor): Promise<StatsSection> {
    const rows = (await options.paces?.rows(actor.campusId)) ?? []
    const measured = rows.flatMap((row) => {
      const found = paceOf(row.startedAt, row.milestones)

      return found === null
        ? []
        : [{ login: row.login, image: row.image, value: found.progress, extra: found.pace ?? 0 }]
    })
    // Más rápido primero; quien va a más de 24 meses (0), al final.
    const months = (row: RankRow): number => (row.extra === 0 ? Infinity : row.extra)
    const sorted = measured.sort(
      (a, b) => months(a) - months(b) || b.value - a.value || a.login.localeCompare(b.login),
    )
    const entries = ranked(sorted)
    const paces = sorted.map(months).filter((value) => value !== Infinity)

    return {
      id: 'ritmo',
      totals: [
        { key: 'people', value: sorted.length },
        { key: 'median', value: paces[Math.floor(paces.length / 2)] ?? 0 },
        { key: 'fast', value: paces.filter((value) => value <= 12).length },
      ],
      ranking: entries.slice(0, TOP),
      me: entries.find((entry) => entry.login === actor.login) ?? null,
    }
  }

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
          const [totals, rows] = await Promise.all([
            stats.totals(id, actor.campusId, since, at),
            stats.ranking(id, actor.campusId, since, at),
          ])
          const entries = ranked(rows)

          return {
            id,
            totals,
            ranking: entries.slice(0, TOP),
            me: entries.find((entry) => entry.login === actor.login) ?? null,
          }
        }),
      )

      return { period, sections: [...sections, await pace(actor)] }
    },
  }
}

export type StatsService = ReturnType<typeof createStatsService>
