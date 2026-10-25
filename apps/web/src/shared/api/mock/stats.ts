/**
 * Estadísticas de Ayuda de mentira: cifras y clasificaciones con logins
 * inventados (también salen en la demostración pública). «Siempre» es «este
 * mes» multiplicado, para que se note el cambio.
 */

import type {
  CoreTrack,
  HelpStats,
  ProgressGroup,
  ProgressLine,
  ProgressPopulation,
  RankingEntry,
  StatsEntry,
  StatsProgress,
  StatsRanking,
  StatsSection,
  StatsSectionId,
} from '@sanatorio/contracts'

import { ME } from './data'
import { portrait } from './portrait'
import { delay } from './state'
import type { Api, RankingQuery } from '../types'

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

/** Lo que cambia cada población frente a «en curso + terminado»: hasta dónde llega y cuánto tarda. */
const POPULATION_SHAPE: Record<ProgressPopulation, { scale: number; until: number }> = {
  finished: { scale: 1.45, until: 730 },
  current: { scale: 1, until: 730 },
  // Quien se fue no pasa del año: después ya no está.
  blackholed: { scale: 0.45, until: 420 },
}

function progressMock(other: string | null): StatsProgress {
  const groups = (
    scale: number,
    population: ProgressPopulation,
  ): Record<ProgressGroup, ProgressLine> => {
    const { scale: shape, until } = POPULATION_SHAPE[population]
    const top = (value: number): number => Math.min(100, value * scale * shape)

    return {
      'campus-all': curve(top(62), 260, until),
      'campus-classic': curve(top(58), 280, until),
      'campus-next': curve(top(66), 230, Math.min(until, 450)),
      'all-all': curve(top(55), 280, until),
      'all-classic': curve(top(52), 300, until),
      'all-next': curve(top(60), 250, Math.min(until, 450)),
    }
  }
  const byPopulation = (scale: number) => ({
    finished: groups(scale, 'finished'),
    current: groups(scale, 'current'),
    blackholed: groups(scale, 'blackholed'),
  })
  const people = (factor: number): Record<ProgressGroup, number> => ({
    'campus-all': Math.round(420 * factor),
    'campus-classic': Math.round(310 * factor),
    'campus-next': Math.round(110 * factor),
    'all-all': Math.round(5300 * factor),
    'all-classic': Math.round(4700 * factor),
    'all-next': Math.round(600 * factor),
  })
  const census = (
    factor: number,
  ): Record<CoreTrack, StatsProgress['census']['campus']['classic']> => ({
    classic: {
      finished: Math.round(95 * factor),
      active: Math.round(215 * factor),
      blackholed: Math.round(640 * factor),
      unknown: Math.round(38 * factor),
    },
    next: {
      finished: 0,
      active: Math.round(110 * factor),
      blackholed: Math.round(12 * factor),
      unknown: Math.round(9 * factor),
    },
  })
  const paces = (share: (circle: number) => number) =>
    Object.entries(PACE_DAYS).map(([pace, days]) => ({
      pace: Number(pace),
      points: [
        [0, 0] as [number, number],
        ...days.map((day, circle): [number, number] => [day, share(circle)]),
      ],
    }))
  const circles = (circle: number): number => Math.round(((circle + 1) / 7) * 1000) / 10

  return {
    days: DAYS,
    track: 'next',
    me: { circles: curve(70, 200, 300), hours: curve(55, 220, 300) },
    other:
      other === null
        ? null
        : { login: other, line: { circles: curve(60, 260, 420), hours: curve(48, 280, 420) } },
    averages: { circles: byPopulation(1), hours: byPopulation(0.8) },
    people: { finished: people(0.3), current: people(1), blackholed: people(2.1) },
    census: { campus: census(1), all: census(12) },
    axis: {
      circles: [0, 1, 2, 3, 4, 5, 6].map(circles),
      hours: 1456,
      planHours: { classic: 1786, next: 1436 },
    },
    paces: {
      circles: paces(circles),
      hours: paces((circle) => HOURS_SHARE[circle] ?? 100),
    },
  }
}

// --- Quién va más rápido: gente inventada, con quien mira hacia el puesto 60.

const FIRST = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'i', 'j', 'l', 'm', 'n', 'p', 'r', 's', 'v']
const LAST = [
  'alba',
  'bosque',
  'cerro',
  'duna',
  'fresno',
  'garza',
  'hiedra',
  'lince',
  'monte',
  'nube',
  'olmo',
  'prado',
  'roble',
  'sauce',
  'trigo',
]
const KICKOFFS = ['2026-09', '2026-02', '2025-09', '2025-02', '2024-09', '2024-03']

/** Un número de 0 a 1 que siempre sale igual para el mismo `n`. */
const noise = (n: number): number => {
  const x = Math.sin(n * 12.9898) * 43758.5453

  return x - Math.floor(x)
}

type MockRunner = Omit<RankingEntry, 'rank'> & { kickoff: string }

const RUNNERS: MockRunner[] = Array.from({ length: 240 }, (_, n): MockRunner => {
  const kickoff = KICKOFFS[n % KICKOFFS.length] ?? '2025-09'
  const age = KICKOFFS.length - KICKOFFS.indexOf(kickoff)
  const circles = Math.min(100, Math.round((age * 14 + noise(n) * 30) * 10) / 10)
  const login =
    n === 73
      ? ME.login
      : `${FIRST[n % FIRST.length] ?? 'a'}${LAST[(n * 7) % LAST.length] ?? 'olmo'}${n > 30 ? String(n) : ''}`

  return {
    login,
    image: portrait(login),
    track: n % 3 === 0 ? 'next' : 'classic',
    kickoff,
    circle: circles >= 100 ? 7 : Math.floor((circles / 100) * 7),
    circles,
    hours: Math.min(100, Math.round(circles * (0.8 + noise(n + 1) * 0.3) * 10) / 10),
  }
})

function rankingMock(query: RankingQuery): StatsRanking {
  const pct = (runner: MockRunner): number => (query.by === 'hours' ? runner.hours : runner.circles)
  const key = (runner: MockRunner): number[] =>
    query.by === 'circle'
      ? [runner.circle, runner.circles]
      : query.by === 'circles'
        ? [runner.circles, runner.hours]
        : [runner.hours, runner.circles]
  const planned = RUNNERS.filter((runner) => query.plan === 'all' || runner.track === query.plan)
  const kept = planned
    .filter(
      (runner) =>
        (query.kickoff === null ||
          (query.cohort === 'only'
            ? runner.kickoff === query.kickoff
            : runner.kickoff >= query.kickoff)) &&
        runner.circle >= query.circleMin &&
        runner.circle <= query.circleMax &&
        pct(runner) >= query.pctMin &&
        pct(runner) <= query.pctMax,
    )
    .sort((a, b) => {
      const [a1 = 0, a2 = 0] = key(a)
      const [b1 = 0, b2 = 0] = key(b)

      return b1 - a1 || b2 - a2 || a.login.localeCompare(b.login)
    })
  const entries: RankingEntry[] = kept.map((runner, index) => ({
    rank: index + 1,
    login: runner.login,
    image: runner.image,
    track: runner.track,
    circle: runner.circle,
    circles: runner.circles,
    hours: runner.hours,
  }))

  return {
    // Como la API: solo los meses con gente del plan elegido.
    kickoffs: KICKOFFS.map((month) => ({
      month,
      people: planned.filter((runner) => runner.kickoff === month).length,
    })).filter((kickoff) => kickoff.people > 0),
    total: entries.length,
    offset: query.offset,
    entries: entries.slice(query.offset, query.offset + query.limit),
    me: entries.find((entry) => entry.login === ME.login) ?? null,
  }
}

export const statsMock: Pick<Api, 'getHelpStats' | 'getStatsProgress' | 'getStatsRanking'> = {
  async getStatsProgress(other): Promise<StatsProgress> {
    await delay(200)

    return progressMock(other)
  },

  async getStatsRanking(query): Promise<StatsRanking> {
    await delay(150)

    return rankingMock(query)
  },

  async getHelpStats(period): Promise<HelpStats> {
    await delay(200)

    const times = period === 'all' ? 4 : 1

    return {
      period,
      sections: (Object.keys(MONTH) as StatsSectionId[]).map((id) => sectionOf(id, times)),
    }
  },
}
