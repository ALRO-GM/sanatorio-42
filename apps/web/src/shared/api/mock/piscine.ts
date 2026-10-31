/**
 * La piscina de mentira (`docs/piscineros.md`): lo que ve un piscinero en el
 * tablón, al elegir proyecto y en su Avance. Sale con `mock_pool` o la vista de
 * piscinero del panel (`poolMocking`). Logins inventados.
 */

import type {
  GraphProject,
  HolyGraph,
  PiscineAverage,
  PiscineProgress,
  PiscineTrace,
  ProjectSummary,
} from '@sanatorio/contracts'

import { ME, PISCINE_PROJECTS } from './data'
import { poolUnrestricted } from './pool'
import { portrait } from './portrait'
import { state } from './state'

const DAY = 86_400_000
/** El piscinero de mentira lleva once días de piscina. */
const ELAPSED = 11
const DAYS = Array.from({ length: 31 }, (_, day) => day)
const COUNTED = PISCINE_PROJECTS.filter(
  (project) => project.group === 'shell' || project.group === 'c',
)

/** Los proyectos de la piscina para elegir: lo que lleva en curso primero, como la API. */
export function piscineProjects(): ProjectSummary[] {
  const all = PISCINE_PROJECTS.map(({ id, name, status, group }) =>
    status === undefined ? { id, name, group } : { id, name, status, group },
  )

  return [
    ...all.filter((project) => project.status === 'in_progress'),
    ...all.filter((project) => project.status !== 'in_progress'),
  ]
}

/** El grafo del tablón de un piscinero: lo que cuenta en el 0 y lo de aparte en el 1. */
export function piscineGraph(): HolyGraph {
  const node = (project: (typeof PISCINE_PROJECTS)[number]): GraphProject => {
    const status = project.status ?? 'todo'
    const unanswered = state.doubts.filter(
      (doubt) =>
        doubt.projectId === project.id &&
        !doubt.resolved &&
        doubt.replies.length === 0 &&
        doubt.author !== ME.login,
    ).length

    return {
      projectId: project.id,
      name: project.name,
      short: project.short,
      status,
      perfect: project.id === 1500,
      hours: null,
      series: null,
      choice: null,
      locked: false,
      corrected: status === 'finished' ? 2 : 0,
      retired: false,
      signals: {
        unanswered: status === 'todo' ? 0 : unanswered,
        proposals: 0,
        missingGuide: status === 'finished' && state.guides[project.id] === undefined,
      },
      group: project.group,
    }
  }

  return {
    kind: 'piscine',
    track: 'classic',
    level: null,
    startedAt: new Date(Date.now() - ELAPSED * DAY).toISOString(),
    currentCircle: 1,
    knownUpTo: 1,
    circles: [
      { circle: 0, projects: COUNTED.map(node) },
      { circle: 1, projects: PISCINE_PROJECTS.filter((p) => !COUNTED.includes(p)).map(node) },
    ],
  }
}

/** Una línea que aprueba un proyecto cada tantos días, desde el día `from`, hasta `elapsed`. */
function swim(every: number, from: number, elapsed: number): PiscineTrace {
  const value = (day: number): number =>
    Math.min(COUNTED.length, day < from ? 0 : 1 + Math.floor((day - from) / every))
  const line = DAYS.map((day) => (day > elapsed ? null : value(day)))
  const milestones = DAYS.filter(
    (day) => day <= elapsed && value(day) > (day === 0 ? 0 : value(day - 1)),
  ).map((day) => ({
    day,
    projects: [COUNTED[value(day) - 1]?.short ?? ''],
    value: value(day),
  }))

  return { line, done: value(elapsed), milestones }
}

const average = (
  people: number,
  every: number,
  elapsed: number,
  since: number,
): PiscineAverage => ({
  line: swim(every, 0, elapsed).line,
  people,
  individuals: [],
  since: new Date(Date.now() - since * DAY).toISOString(),
})

/** Compañeros de piscina inventados con quien compararse. */
const MATES: Record<string, [every: number, from: number]> = {
  'lmar-pis': [2, 0],
  tnavarro: [3, 1],
  'achen-pi': [2.5, 0],
}

/**
 * Toda la piscina inventada, para la vista sin límites del dueño: cuarenta
 * piscineros, de quien aprueba algo cada día y medio a quien va muy despacio.
 */
const everyone = (): NonNullable<PiscineProgress['everyone']> =>
  Array.from({ length: 40 }, (_, index) => {
    const login = `pisci${String(index + 1).padStart(2, '0')}`

    return {
      login,
      image: portrait(login),
      ...swim(1.5 + ((index * 7) % 40) / 6, index % 3, ELAPSED),
    }
  })

/** El Avance de un piscinero: su línea, la de su piscina y con quien se compara. */
export function piscineProgress(others: readonly string[]): PiscineProgress {
  return {
    days: DAYS,
    steps: COUNTED.map((project) => ({
      short: project.short,
      group: project.group === 'shell' ? 'shell' : 'c',
    })),
    startedAt: new Date(Date.now() - ELAPSED * DAY).toISOString(),
    me: swim(2.6, 0, ELAPSED),
    cohort: average(73, 3, ELAPSED, ELAPSED),
    others: others.flatMap((login) => {
      const mate = MATES[login]

      return mate === undefined ? [] : [{ login, ...swim(mate[0], mate[1], ELAPSED) }]
    }),
    minPeople: 10,
    campus: 'Madrid',
    ...(poolUnrestricted() ? { everyone: everyone() } : {}),
  }
}
