/**
 * Estadísticas de Ayuda de mentira: cifras y clasificaciones con logins
 * inventados (también salen en la demostración pública). «Siempre» es «este
 * mes» multiplicado, para que se note el cambio.
 */

import type {
  CoreTrack,
  FastestEntry,
  HelpStats,
  ProgressArea,
  ProgressCampus,
  ProgressIndividual,
  ProgressLine,
  ProgressMeasure,
  ProgressMilestone,
  ProgressPopulation,
  ProgressTrace,
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
 * Cuánta gente hay en cada media de tu campus y de todos. Python en tu campus
 * tiene muy poca gente que terminó o se fue: ahí van las líneas de cada
 * persona, como en la API.
 */
const PEOPLE: Record<'home' | 'all', ProgressArea['people']> = {
  home: {
    finished: { classic: 93, next: 1 },
    current: { classic: 310, next: 110 },
    blackholed: { classic: 651, next: 4 },
  },
  all: {
    finished: { classic: 1410, next: 3 },
    current: { classic: 4700, next: 600 },
    blackholed: { classic: 9870, next: 140 },
  },
}
const MIN_PEOPLE = 10
/** Tu campus en la API de mentira. */
const HOME = 22
/** Los campus que se pueden pedir: el tuyo primero y los que sigue la web. */
const PROGRESS_CAMPUSES: ProgressCampus[] = [
  { id: HOME, name: 'Madrid' },
  { id: 37, name: 'Málaga' },
  { id: 40, name: 'Urduliz' },
  { id: 46, name: 'Barcelona' },
  { id: 1, name: 'Paris' },
]
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

/**
 * Los proyectos del plan de Python, en orden y con sus horas: de ellos salen
 * los hitos de cada persona de mentira (nombres de proyectos, no de gente).
 */
const PROJECTS: [name: string, hours: number][] = [
  ['Libft', 70],
  ['ft_printf', 55],
  ['get_next_line', 55],
  ['push_swap', 70],
  ['Born2beroot', 50],
  ...Array.from({ length: 11 }, (_, n): [string, number] => [
    `Python Module ${String(n).padStart(2, '0')}`,
    4 + Math.floor(n / 2),
  ]),
  ['A-Maze-ing', 50],
  ['Exam Rank 02', 0],
  ['Codexion', 80],
  ['Fly-in', 120],
  ['Call Me Maybe', 80],
  ['Exam Rank 03', 0],
  ['NetPractice', 50],
  ['Pac-Man', 150],
  ['RAG against the machine', 150],
  ['Exam Rank 04', 0],
  ['Inception', 150],
  ['The Answer Protocol', 150],
  ['Agent Smith', 100],
  ['Exam Rank 05', 0],
  ['ft_transcendence', 245],
  ['Exam Rank 06', 0],
]
const PLAN_HOURS = PROJECTS.reduce((sum, [, hours]) => sum + hours, 0)
/** Dónde acaba cada círculo (0…6) en `PROJECTS`: el índice del primero del siguiente. */
const CIRCLE_ENDS = [1, 4, 18, 22, 26, 30, 32]

/**
 * El avance por círculos de tener aprobados los `count` primeros proyectos: como
 * en la API, cada círculo pesa 1/7 y sus proyectos se lo reparten, así que
 * completar un círculo cae justo en su marca del eje.
 */
function circlesUpTo(count: number): number {
  let share = 0

  CIRCLE_ENDS.forEach((end, circle) => {
    const begin = CIRCLE_ENDS[circle - 1] ?? 0

    share += Math.max(0, Math.min(count, end) - begin) / (end - begin) / CIRCLE_ENDS.length
  })

  return Math.round(share * 1000) / 10
}

/**
 * La línea de una persona de mentira, con sus hitos, siempre igual para el
 * mismo login: aprueba `share` del plan (en orden) repartido hasta el día
 * `last`, y sale de los datos el día `until`. Con `share` 1 terminó: su línea
 * llega al 100 % el día `last` y ahí se queda, como en la API.
 */
function traceOf(login: string, share: number, last: number, until = LAST_DAY): ProgressTrace {
  let seed = 0

  for (let index = 0; index < login.length; index++) seed += login.charCodeAt(index)
  const count = Math.max(1, Math.round(share * PROJECTS.length))
  const passed = PROJECTS.slice(0, count)
  const finished = count === PROJECTS.length
  // Por círculos, 1/7 cada círculo; por horas, sus horas sobre las de lo que hizo.
  const total = finished ? passed.reduce((sum, [, hours]) => sum + hours, 0) : PLAN_HOURS
  const milestones: ProgressMilestone[] = []
  let hours = 0

  passed.forEach(([name, each], index) => {
    // Al principio más deprisa, al final más despacio; con algo de ruido, y días enteros.
    const at = Math.round(last * ((index + 1) / count) ** (1.2 + noise(seed) * 0.4))
    const day = index === count - 1 ? last : Math.min(last, at)

    hours += each
    const value = {
      circles: circlesUpTo(index + 1),
      hours: Math.round((hours / total) * 1000) / 10,
    }
    const same = milestones.at(-1)

    if (same?.day === day) {
      same.projects.push(name)
      same.value = value
    } else {
      milestones.push({ day, projects: [name], value })
    }
  })

  const at = (day: number, measure: ProgressMeasure): number | null => {
    if (day > until) return null
    let value = 0

    for (const milestone of milestones) if (milestone.day <= day) value = milestone.value[measure]

    return value
  }

  return {
    line: {
      circles: DAYS.map((day) => at(day, 'circles')),
      hours: DAYS.map((day) => at(day, 'hours')),
    },
    hours: Math.round(total),
    finished: finished ? last : null,
    milestones: milestones.filter((milestone) => milestone.day <= until),
  }
}

/** La línea de alguien que sigue: entre el 55 y el 100 % sin terminar, hasta el día `until`. */
function personLine(login: string, until = LAST_DAY): ProgressTrace {
  let seed = 0

  for (let index = 0; index < login.length; index++) seed += login.charCodeAt(index)

  return traceOf(login, Math.min(0.95, 0.55 + noise(seed) * 0.45), until - 30, until)
}

/**
 * Las medias de mentira de un campus (o de todos, `id` `null`): tu campus y
 * todos, como siempre; los demás, parecidos a tu campus, cada uno con su
 * gente, su ritmo y sin nadie de Python que haya terminado o se haya ido.
 */
function areaMock(id: number | null): ProgressArea {
  const all = id === null
  // De 0,5 a 1,3 veces tu campus, siempre igual para el mismo campus.
  const size = all || id === HOME ? 1 : 0.5 + noise(id) * 0.8
  const people: ProgressArea['people'] = all
    ? PEOPLE.all
    : {
        finished: { classic: Math.round(93 * size), next: id === HOME ? 1 : 0 },
        current: { classic: Math.round(310 * size), next: Math.round(110 * size) },
        blackholed: { classic: Math.round(651 * size), next: id === HOME ? 4 : 0 },
      }
  const pace = all || id === HOME ? 1 : 0.85 + noise(id + 7) * 0.3
  const lines = (
    scale: number,
    population: ProgressPopulation,
  ): Record<CoreTrack, ProgressLine> => {
    const { scale: shape, until } = POPULATION_SHAPE[population]
    const top = (value: number): number => Math.min(100, value * scale * shape * pace)
    const average = (track: CoreTrack, line: ProgressLine): ProgressLine =>
      people[population][track] < MIN_PEOPLE ? line.map(() => null) : line

    return all
      ? {
          classic: average('classic', curve(top(52), 300, until)),
          next: average('next', curve(top(60), 250, Math.min(until, 450))),
        }
      : {
          classic: average('classic', curve(top(58), 280 / pace, until)),
          next: average('next', curve(top(66), 230 / pace, Math.min(until, 450))),
        }
  }
  const byPopulation = (scale: number) => ({
    finished: lines(scale, 'finished'),
    current: lines(scale, 'current'),
    blackholed: lines(scale, 'blackholed'),
  })
  const factor = all ? 12 : size
  const none = (): Record<CoreTrack, ProgressIndividual[]> => ({ classic: [], next: [] })
  const finished = PYTHON_FINISHERS.map((each) => ({
    login: each.login,
    ...traceOf(each.login, 1, each.days),
  }))
  // Quien se tragó el black hole, sin nombre (pero con lo que aprobó).
  const gone = [0, 1, 2, 3].map((n) => ({
    ...personLine(`bh${String(n)}`, 200 + n * 60),
    login: null,
  }))

  return {
    id,
    name: PROGRESS_CAMPUSES.find((campus) => campus.id === id)?.name ?? null,
    averages: { circles: byPopulation(1), hours: byPopulation(0.8) },
    individuals:
      id === HOME
        ? {
            finished: { ...none(), next: finished.slice(0, 1) },
            current: none(),
            blackholed: { ...none(), next: gone },
          }
        : {
            finished: { ...none(), next: all ? finished : [] },
            current: none(),
            blackholed: none(),
          },
    people,
    census: {
      classic: {
        finished: Math.round(93 * factor),
        active: Math.round(217 * factor),
        blackholed: Math.round(651 * factor),
        unknown: Math.round(38 * factor),
      },
      next: {
        finished: people.finished.next,
        active: Math.round(109 * factor),
        blackholed: all ? 140 : people.blackholed.next,
        unknown: Math.round(9 * factor),
      },
    },
  }
}

function progressMock(others: readonly string[], asked: readonly number[] | null): StatsProgress {
  const wanted = new Set(asked ?? [HOME])
  const picked = PROGRESS_CAMPUSES.filter((campus) => wanted.has(campus.id))
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
    me: { ...traceOf(ME.login, 0.62, 290, 300), hours: 1456 },
    home: HOME,
    available: PROGRESS_CAMPUSES,
    // Como la API: lo que no se puede pedir se ignora; sin nada que valga, el tuyo.
    campuses: (picked.length === 0 ? [HOME] : picked.map((campus) => campus.id)).map(areaMock),
    all: areaMock(null),
    // Como la API: sin una misma y como mucho cinco.
    others: [...new Set(others)]
      .filter((login) => login !== ME.login)
      .slice(0, 5)
      .map((login) => {
        const days = finishers.get(login)

        return {
          login,
          ...(days === undefined ? personLine(login, 1100) : traceOf(login, 1, days)),
        }
      }),
    minPeople: MIN_PEOPLE,
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
  async getStatsProgress(others, campuses = null): Promise<StatsProgress> {
    await delay(200)

    return progressMock(others, campuses)
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
