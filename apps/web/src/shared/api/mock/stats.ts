/**
 * Estadísticas de Ayuda de mentira: cifras y clasificaciones con logins
 * inventados (también salen en la demostración pública). «Siempre» es «este
 * mes» multiplicado, para que se note el cambio.
 */

import type {
  CoreTrack,
  FastestEntry,
  HelpStats,
  ProgressGroup,
  ProgressIndividual,
  ProgressLine,
  ProgressMeasure,
  ProgressPopulation,
  RankingEntry,
  StatsEntry,
  StatsFastest,
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

/** Un número de 0 a 1 que siempre sale igual para el mismo `n`. */
const noise = (n: number): number => {
  const x = Math.sin(n * 12.9898) * 43758.5453

  return x - Math.floor(x)
}

/** Como la API: cada 15 días hasta los dos años y, después, cada 30 hasta cuatro años («Todo»). */
const DAYS = [
  ...Array.from({ length: 50 }, (_, index) => Math.min(730, index * 15)),
  ...Array.from({ length: 25 }, (_, index) => 750 + index * 30),
]
/** El último día con datos: quien más tiempo lleva. */
const LAST_DAY = 1470
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
const curve = (top: number, speed: number, until = LAST_DAY): ProgressLine =>
  DAYS.map((day) => (day > until ? null : Math.round(top * (1 - Math.exp(-day / speed)) * 10) / 10))

/** Lo que cambia cada población frente a «en curso + terminado»: hasta dónde llega y cuánto tarda. */
const POPULATION_SHAPE: Record<ProgressPopulation, { scale: number; until: number }> = {
  finished: { scale: 1.45, until: LAST_DAY },
  current: { scale: 1, until: LAST_DAY },
  // Quien se fue no pasa del año: después ya no está.
  blackholed: { scale: 0.45, until: 420 },
}

/**
 * Cuánta gente hay en cada media. Python en el campus tiene muy poca gente que
 * terminó o se fue: ahí van las líneas de cada persona, como en la API.
 */
const PEOPLE: Record<ProgressPopulation, Record<ProgressGroup, number>> = {
  finished: { 'campus-classic': 93, 'campus-next': 1, 'all-classic': 1410, 'all-next': 3 },
  current: { 'campus-classic': 310, 'campus-next': 110, 'all-classic': 4700, 'all-next': 600 },
  blackholed: { 'campus-classic': 651, 'campus-next': 4, 'all-classic': 9870, 'all-next': 140 },
}
const MIN_PEOPLE = 10
/** Quien terminó Python: de este campus, la primera; las otras, de otros. */
const PYTHON_FINISHERS: { login: string; campus: string; days: number }[] = [
  { login: 'nvelasco', campus: 'Madrid', days: 212 },
  { login: 'ktorres', campus: 'Barcelona', days: 297 },
  { login: 'rmolina', campus: 'Málaga', days: 341 },
]
const C_FINISHERS: { login: string; campus: string; days: number }[] = [
  { login: 'aprado', campus: 'Madrid', days: 268 },
  { login: 'jroble', campus: 'Madrid', days: 301 },
  { login: 'msauce', campus: 'Madrid', days: 333 },
  { login: 'lgarza', campus: 'Madrid', days: 352 },
  { login: 'dolmo', campus: 'Madrid', days: 379 },
  { login: 'ifresno', campus: 'Barcelona', days: 289 },
  { login: 'etrigo', campus: 'Málaga', days: 318 },
  { login: 'pnube', campus: 'Urduliz', days: 356 },
]

/** La línea de una persona de mentira, siempre igual para el mismo login. */
function personLine(login: string, until = LAST_DAY): Record<ProgressMeasure, ProgressLine> {
  let seed = 0

  for (let index = 0; index < login.length; index++) seed += login.charCodeAt(index)
  const top = 55 + noise(seed) * 45
  const speed = 160 + noise(seed + 1) * 200

  return { circles: curve(top, speed, until), hours: curve(top * 0.9, speed * 1.1, until) }
}

/** Quien terminó en `days`: llega al 100 % ese día y ahí se queda. */
function finisherLine(days: number): Record<ProgressMeasure, ProgressLine> {
  const line = DAYS.map((day) =>
    day >= days ? 100 : Math.round(100 * (1 - Math.exp((-day / days) * 2.6)) * 10) / 10,
  )

  return { circles: line, hours: line.map((value) => Math.round(value * 0.97 * 10) / 10) }
}

function individualsMock(): StatsProgress['individuals'] {
  const none = (): Record<ProgressGroup, ProgressIndividual[]> => ({
    'campus-classic': [],
    'campus-next': [],
    'all-classic': [],
    'all-next': [],
  })
  const finished = PYTHON_FINISHERS.map((each) => ({
    login: each.login,
    line: finisherLine(each.days),
  }))
  // Quien se tragó el black hole, sin nombre.
  const gone = [0, 1, 2, 3].map((n) => ({
    login: null,
    line: personLine(`bh${String(n)}`, 200 + n * 60),
  }))

  return {
    finished: { ...none(), 'campus-next': finished.slice(0, 1), 'all-next': finished },
    current: none(),
    blackholed: { ...none(), 'campus-next': gone },
  }
}

function progressMock(others: readonly string[]): StatsProgress {
  const groups = (
    scale: number,
    population: ProgressPopulation,
  ): Record<ProgressGroup, ProgressLine> => {
    const { scale: shape, until } = POPULATION_SHAPE[population]
    const top = (value: number): number => Math.min(100, value * scale * shape)
    const average = (group: ProgressGroup, line: ProgressLine): ProgressLine =>
      PEOPLE[population][group] < MIN_PEOPLE ? line.map(() => null) : line

    return {
      'campus-classic': average('campus-classic', curve(top(58), 280, until)),
      'campus-next': average('campus-next', curve(top(66), 230, Math.min(until, 450))),
      'all-classic': average('all-classic', curve(top(52), 300, until)),
      'all-next': average('all-next', curve(top(60), 250, Math.min(until, 450))),
    }
  }
  const byPopulation = (scale: number) => ({
    finished: groups(scale, 'finished'),
    current: groups(scale, 'current'),
    blackholed: groups(scale, 'blackholed'),
  })
  const census = (
    factor: number,
  ): Record<CoreTrack, StatsProgress['census']['campus']['classic']> => ({
    classic: {
      finished: Math.round(93 * factor),
      active: Math.round(217 * factor),
      blackholed: Math.round(651 * factor),
      unknown: Math.round(38 * factor),
    },
    next: {
      finished: factor === 1 ? 1 : 3,
      active: Math.round(109 * factor),
      blackholed: factor === 1 ? 4 : 140,
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
  const finishers = new Map(
    [...PYTHON_FINISHERS, ...C_FINISHERS].map((each) => [each.login, each.days]),
  )

  return {
    days: DAYS,
    track: 'next',
    me: { circles: curve(70, 200, 300), hours: curve(55, 220, 300) },
    campus: 'Madrid',
    // Como la API: sin una misma y como mucho cinco.
    others: [...new Set(others)]
      .filter((login) => login !== ME.login)
      .slice(0, 5)
      .map((login) => {
        const days = finishers.get(login)

        return { login, line: days === undefined ? personLine(login, 1100) : finisherLine(days) }
      }),
    averages: { circles: byPopulation(1), hours: byPopulation(0.8) },
    individuals: individualsMock(),
    minPeople: MIN_PEOPLE,
    people: PEOPLE,
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

function fastestMock(): StatsFastest {
  const entry = (each: { login: string; campus: string; days: number }): FastestEntry => ({
    ...each,
    image: portrait(each.login),
  })
  const firstOfEach = (list: typeof C_FINISHERS) =>
    list.filter((each, index) => list.findIndex((other) => other.campus === each.campus) === index)

  return {
    campus: {
      classic: C_FINISHERS.filter((each) => each.campus === 'Madrid').map(entry),
      next: PYTHON_FINISHERS.filter((each) => each.campus === 'Madrid').map(entry),
    },
    all: {
      classic: firstOfEach(C_FINISHERS)
        .sort((a, b) => a.days - b.days)
        .map(entry),
      next: firstOfEach(PYTHON_FINISHERS).map(entry),
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

export const statsMock: Pick<
  Api,
  'getHelpStats' | 'getStatsProgress' | 'getStatsFastest' | 'getStatsRanking'
> = {
  async getStatsProgress(others): Promise<StatsProgress> {
    await delay(200)

    return progressMock(others)
  },

  async getStatsFastest(): Promise<StatsFastest> {
    await delay(150)

    return fastestMock()
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
