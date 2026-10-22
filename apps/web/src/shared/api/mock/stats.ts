/**
 * Estadísticas de Ayuda de mentira: cifras y clasificaciones con logins
 * inventados (también salen en la demostración pública). «Siempre» es «este
 * mes» multiplicado, para que se note el cambio.
 */

import type {
  HelpStats,
  ProgressGroup,
  ProgressLine,
  StatsEntry,
  StatsProgress,
  StatsSection,
  StatsSectionId,
} from '@sanatorio/contracts'

import { ME } from './data'
import { portrait } from './portrait'
import { delay } from './state'
import type { Api } from '../types'

type Row = [login: string, value: number, extra: number]

const MONTH: Record<StatsSectionId, { totals: Record<string, number>; rows: Row[] }> = {
  consulta: {
    totals: { sessions: 48, verified: 31, minutes: 1290, helped: 26 },
    rows: [
      ['jdoe', 9, 360],
      ['cfernandez', 7, 240],
      [ME.login, 5, 180],
      ['mgarcia', 5, 150],
      ['anavarro', 3, 90],
      ['lruiz', 2, 60],
    ],
  },
  tablon: {
    totals: { doubts: 64, answers: 141, solved: 39 },
    rows: [
      ['mgarcia', 11, 25],
      ['jdoe', 8, 19],
      ['lsoto', 6, 9],
      ['anavarro', 4, 12],
      [ME.login, 2, 7],
    ],
  },
  terapia: {
    totals: { groups: 14, seats: 52, people: 37 },
    rows: [
      ['lsoto', 6, 2],
      [ME.login, 4, 1],
      ['cfernandez', 4, 0],
      ['rsoto', 3, 1],
    ],
  },
  pizarras: {
    totals: { boards: 6, seats: 71, people: 49 },
    rows: [
      ['cfernandez', 34, 3],
      ['jdoe', 22, 2],
      ['anavarro', 15, 1],
    ],
  },
  ritmo: {
    totals: { people: 41, median: 18, fast: 6 },
    rows: [
      ['lruiz', 42, 8],
      ['cfernandez', 59, 12],
      [ME.login, 42, 15],
      ['jdoe', 24, 18],
      ['mgarcia', 16, 0],
    ],
  },
  notgames: {
    totals: { games: 23, people: 18, correct: 412, wrong: 167 },
    rows: [
      ['lruiz', 7, 96],
      [ME.login, 5, 81],
      ['mgarcia', 5, 74],
      ['jdoe', 3, 58],
      ['lsoto', 1, 40],
    ],
  },
}

function sectionOf(id: StatsSectionId, times: number): StatsSection {
  const { totals, rows } = MONTH[id]
  const entries: StatsEntry[] = []

  for (const [index, [login, value, extra]] of rows.entries()) {
    const previous = entries[index - 1]
    const tie = previous?.value === value * times && previous.extra === extra * times

    entries.push({
      rank: tie ? previous.rank : index + 1,
      login,
      image: portrait(login),
      value: value * times,
      extra: extra * times,
    })
  }

  return {
    id,
    totals: Object.entries(totals).map(([key, value]) => ({ key, value: value * times })),
    ranking: entries,
    me: entries.find((entry) => entry.login === ME.login) ?? null,
  }
}

// --- Avance (#87): curvas suaves, de mentira, que se parecen a las de verdad.

const DAYS = Array.from({ length: 50 }, (_, index) => Math.min(730, index * 15))
const PACE_DAYS: Record<number, number[]> = {
  8: [8, 32, 54, 90, 141, 212, 244],
  12: [13, 48, 81, 134, 211, 318, 365],
  15: [18, 60, 101, 168, 264, 398, 457],
  18: [24, 72, 121, 201, 316, 478, 548],
  22: [30, 88, 148, 246, 387, 584, 670],
  24: [45, 118, 178, 306, 447, 644, 730],
}
const HOURS_SHARE = [3, 8, 22, 34, 58, 82, 100]

/** Una curva que tiende a `top` (en %) con esa rapidez, hasta el día `until`. */
const curve = (top: number, speed: number, until = 730): ProgressLine =>
  DAYS.map((day) => (day > until ? null : Math.round(top * (1 - Math.exp(-day / speed)) * 10) / 10))

function progressMock(other: string | null): StatsProgress {
  const groups = (scale: number): Record<ProgressGroup, ProgressLine> => ({
    'campus-all': curve(62 * scale, 260),
    'campus-classic': curve(58 * scale, 280),
    'campus-next': curve(66 * scale, 230, 450),
    'all-all': curve(55 * scale, 280),
    'all-classic': curve(52 * scale, 300),
    'all-next': curve(60 * scale, 250, 450),
  })
  const paces = (share: (circle: number) => number) =>
    Object.entries(PACE_DAYS).map(([pace, days]) => ({
      pace: Number(pace),
      points: [
        [0, 0] as [number, number],
        ...days.map((day, circle): [number, number] => [day, share(circle)]),
      ],
    }))

  return {
    days: DAYS,
    track: 'next',
    me: { circles: curve(70, 200, 300), hours: curve(55, 220, 300) },
    other:
      other === null
        ? null
        : { login: other, line: { circles: curve(60, 260, 420), hours: curve(48, 280, 420) } },
    averages: { circles: groups(1), hours: groups(0.8) },
    people: {
      'campus-all': 420,
      'campus-classic': 310,
      'campus-next': 110,
      'all-all': 5300,
      'all-classic': 4700,
      'all-next': 600,
    },
    paces: {
      circles: paces((circle) => Math.round(((circle + 1) / 7) * 1000) / 10),
      hours: paces((circle) => HOURS_SHARE[circle] ?? 100),
    },
  }
}

export const statsMock: Pick<Api, 'getHelpStats' | 'getStatsProgress'> = {
  async getStatsProgress(other): Promise<StatsProgress> {
    await delay(200)

    return progressMock(other)
  },

  async getHelpStats(period): Promise<HelpStats> {
    await delay(200)

    const times = period === 'all' ? 4 : 1
    // El ritmo no depende del periodo: se mide desde que empezaste. Va el último.
    const ids = (Object.keys(MONTH) as StatsSectionId[]).filter((id) => id !== 'ritmo')

    return {
      period,
      sections: [...ids.map((id) => sectionOf(id, times)), sectionOf('ritmo', 1)],
    }
  },
}
