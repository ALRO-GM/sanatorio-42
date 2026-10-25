/**
 * La agenda en la API simulada (`docs/agenda.md`): dos metas tuyas (ft_printf,
 * con su cuenta atrás para fijar, y get_next_line, dentro del sprint 2) y el
 * tablero de ese sprint con lo de `lruiz` y `gmoreno`, logins inventados.
 * También sale en la demostración pública.
 *
 * Las reglas de verdad (plazos, topes, «Otro» con texto) son de la API; aquí
 * solo las justas para que la pantalla se pueda probar.
 */

import type {
  AgendaCheckpoint,
  AgendaCheckpointKey,
  AgendaEntry,
  AgendaEntryInput,
  AgendaGoal,
  AgendaOptions,
  AgendaProject,
  AgendaProjectKind,
  SprintBoard,
  SprintGoal,
} from '@sanatorio/contracts'

import type { Api } from '../types'
import { calendarEvents } from './calendar'
import { ME, PROJECTS, today } from './data'
import { delay, emptyToNull, fail, newId, state } from './state'

const DAY = 86_400_000

/** `YYYY-MM-DD` de dentro de `days` días, en la hora del navegador. */
const dayFrom = (days: number): string => {
  const at = new Date(Date.parse(`${today()}T12:00:00`) + days * DAY)

  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`
}

const mondayOf = (day: string): string => {
  const at = new Date(`${day}T12:00:00`)

  return dayFrom(
    Math.round((at.getTime() - Date.parse(`${today()}T12:00:00`)) / DAY) - ((at.getDay() + 6) % 7),
  )
}

// Los de fábrica, armados por trozos: el final de casi todos es el mismo.
const close: AgendaCheckpointKey[] = ['sheet', 'breakers', 'git', 'slots']
const OPTIONS: AgendaOptions = {
  checkpoints: [
    'works',
    'subject',
    'sheet',
    'norminette',
    'leaks',
    'breakers',
    'git',
    'slots',
    'flags',
    'canonical',
    'pytools',
    'tests',
    'rebuild',
    'inputs',
    'window',
    'practice',
    'mock',
    'registered',
  ],
  problems: [
    'concept',
    'bug',
    'memory',
    'norminette',
    'subject',
    'time',
    'motivation',
    'waiting',
    'cluster_full',
    'failed_eval',
    'personal',
    'other',
  ],
  solutions: [
    'peer2peer',
    'book_help',
    'pair',
    'sprint',
    'whiteboard',
    'docs',
    'debugger',
    'split',
    'rest',
    'other',
  ],
  defaults: {
    c: ['works', 'subject', 'sheet', 'norminette', 'leaks', 'breakers', 'git', 'slots'],
    graphics: [
      'works',
      'subject',
      'inputs',
      'window',
      'sheet',
      'norminette',
      'leaks',
      'breakers',
      'git',
      'slots',
    ],
    cpp: ['works', 'subject', 'flags', 'canonical', 'leaks', ...close],
    python: ['works', 'subject', 'pytools', 'tests', ...close],
    sysadmin: ['works', 'subject', 'rebuild', ...close],
    exam: ['practice', 'mock', 'registered'],
    other: ['works', 'subject', ...close],
  },
}

/** Los siguientes del plan, inventados como el resto del simulado. */
const NEXT: AgendaProject[] = [
  { id: 2005, name: 'minitalk', status: 'next', kind: 'c', circle: 2 },
  { id: 2004, name: 'pipex', status: 'next', kind: 'c', circle: 2 },
  { id: 1994, name: 'so_long', status: 'next', kind: 'graphics', circle: 2 },
  { id: 1320, name: 'Exam Rank 02', status: 'next', kind: 'exam', circle: 2 },
]

const kindOf = (name: string): AgendaProjectKind =>
  NEXT.find((project) => project.name === name)?.kind ?? 'c'

const checkpoints = (keys: readonly AgendaCheckpointKey[], done: number): AgendaCheckpoint[] =>
  keys.map((key, index) => ({ id: newId(), key, text: null, done: index < done }))

const entry = (change: Partial<AgendaEntry> & Pick<AgendaEntry, 'day'>): AgendaEntry => ({
  id: newId(),
  kind: 'daily',
  plan: [],
  outcome: null,
  problem: null,
  problemOther: null,
  solution: null,
  solutionOther: null,
  progress: null,
  note: null,
  updatedAt: new Date().toISOString(),
  ...change,
})

function initialGoals(): AgendaGoal[] {
  const printf = [
    ...checkpoints(OPTIONS.defaults.c, 3),
    { id: newId(), key: null, text: 'Probar %s con NULL', done: false },
  ]
  const gnl = checkpoints(OPTIONS.defaults.c, 1)

  return [
    {
      id: newId(),
      projectId: 1314,
      projectName: 'ft_printf',
      projectKind: 'c',
      targetDay: dayFrom(4),
      progress: 60,
      note: 'Me queda el %p y los flags',
      status: 'active',
      createdAt: new Date(Date.now() - 6 * DAY).toISOString(),
      closedAt: null,
      checkpoints: printf,
      entries: [
        entry({
          day: dayFrom(-1),
          plan: printf.slice(3, 5).map((each) => each.id),
          outcome: 'partial',
          problem: 'memory',
          solution: 'debugger',
          progress: 55,
          note: 'Valgrind me chiva 3 bloques perdidos',
        }),
      ],
      sprints: [],
    },
    {
      id: newId(),
      projectId: 1337,
      projectName: 'get_next_line',
      projectKind: 'c',
      targetDay: dayFrom(9),
      progress: 30,
      note: null,
      status: 'active',
      createdAt: new Date(Date.now() - 3 * DAY).toISOString(),
      closedAt: null,
      checkpoints: gnl,
      entries: [
        entry({
          kind: 'weekly',
          day: mondayOf(today()),
          plan: gnl.slice(0, 2).map((each) => each.id),
          outcome: 'partial',
          problem: 'other',
          problemOther: 'Con BUFFER_SIZE=1 se me cuelga',
          solution: 'sprint',
        }),
      ],
      sprints: [],
    },
  ]
}

let goals = initialGoals()

/** Una meta como la ve el resto del sprint: cuentas, por dónde va y su atasco. */
function sprintGoalOf(
  goal: Pick<
    AgendaGoal,
    'id' | 'targetDay' | 'progress' | 'status' | 'note' | 'checkpoints' | 'entries'
  >,
): SprintGoal {
  const latest = goal.entries[0]

  return {
    ...goal,
    done: goal.checkpoints.filter((each) => each.done).length,
    total: goal.checkpoints.length,
    stuckOn: goal.checkpoints.find((each) => !each.done) ?? null,
    blocker:
      latest?.problem === undefined || latest.problem === null
        ? null
        : {
            day: latest.day,
            problem: latest.problem,
            problemOther: latest.problemOther,
            solution: latest.solution,
            solutionOther: latest.solutionOther,
          },
    entries: goal.entries.slice(0, 5),
  }
}

/** Lo del resto del sprint 2 (get_next_line): metas inventadas. */
function others(): Record<string, SprintGoal> {
  const board = (login: string, progress: number, done: number, change: Partial<AgendaEntry>) =>
    sprintGoalOf({
      id: newId(),
      targetDay: dayFrom(login === 'lruiz' ? 2 : 11),
      progress,
      status: 'active',
      note: null,
      checkpoints: checkpoints(OPTIONS.defaults.c, done),
      entries: [entry({ day: today(), outcome: 'partial', ...change })],
    })

  return {
    lruiz: board('lruiz', 85, 7, {
      problem: 'waiting',
      solution: 'book_help',
      note: 'Sin franjas de corrección hasta el jueves',
    }),
    gmoreno: board('gmoreno', 20, 1, {
      problem: 'concept',
      solution: 'pair',
      note: 'Las variables static me tienen frito',
    }),
  }
}

let sprintOthers = others()

/** Tus sprints de ese proyecto. */
const sprintsOf = (projectId: number): AgendaGoal['sprints'] =>
  state.groups
    .filter((group) => group.projectId === projectId && group.members.includes(ME.login))
    .map((group) => ({ groupId: group.id, place: group.place, members: group.members.length }))

const view = (goal: AgendaGoal): AgendaGoal => ({ ...goal, sprints: sprintsOf(goal.projectId) })

const mine = (id: number): AgendaGoal => {
  const goal = goals.find((each) => each.id === id)

  if (goal === undefined) throw fail(404, 'Esa meta no existe')

  return goal
}

function saveEntry(goal: AgendaGoal, input: AgendaEntryInput): void {
  if (goal.status !== 'active') throw fail(409, 'Esa meta ya está cerrada')

  const problemOther = input.problem === 'other' ? emptyToNull(input.problemOther) : null
  const solutionOther = input.solution === 'other' ? emptyToNull(input.solutionOther) : null

  if (input.problem === 'other' && problemOther === null) {
    throw fail(400, 'problemOther: con «Otro», escribe cuál')
  }
  if (input.solution === 'other' && solutionOther === null) {
    throw fail(400, 'solutionOther: con «Otro», escribe cuál')
  }

  const day = input.kind === 'weekly' ? mondayOf(input.day) : input.day
  const written = entry({
    kind: input.kind,
    day,
    plan: input.plan ?? [],
    outcome: input.outcome ?? null,
    problem: input.problem ?? null,
    problemOther,
    solution: input.solution ?? null,
    solutionOther,
    progress: input.progress ?? null,
    note: emptyToNull(input.note),
  })

  goal.entries = [
    written,
    ...goal.entries.filter((each) => each.kind !== input.kind || each.day !== day),
  ].sort((a, b) => b.day.localeCompare(a.day))
  if (written.progress !== null) goal.progress = written.progress
}

export const agendaMock: Pick<
  Api,
  | 'getAgenda'
  | 'createAgendaGoal'
  | 'updateAgendaGoal'
  | 'removeAgendaGoal'
  | 'addAgendaCheckpoint'
  | 'markAgendaCheckpoint'
  | 'removeAgendaCheckpoint'
  | 'saveAgendaEntry'
  | 'getSprintBoard'
> = {
  async getAgenda() {
    await delay()

    const until = Date.now() + 14 * DAY

    return {
      today: today(),
      goals: goals.map(view),
      projects: [
        ...PROJECTS.filter((project) => project.status !== 'finished').map(
          (project): AgendaProject => ({
            id: project.id,
            name: project.name,
            status: 'in_progress',
            kind: 'c',
            circle: 1,
          }),
        ),
        ...NEXT,
      ],
      events: calendarEvents(state).filter(
        (event) =>
          ['event_joined', 'exam', 'evaluation'].includes(event.kind) &&
          event.joined !== false &&
          Date.parse(event.start) > Date.now() &&
          Date.parse(event.start) < until,
      ),
      options: OPTIONS,
    }
  },

  async createAgendaGoal(input) {
    await delay()

    const project = [...PROJECTS, ...NEXT].find((each) => each.id === input.projectId)

    if (project === undefined) throw fail(404, 'Ese proyecto no existe en 42')
    if (input.targetDay < today()) throw fail(400, 'targetDay: ese día ya ha pasado')

    const kind = kindOf(project.name)
    const goal: AgendaGoal = {
      id: newId(),
      projectId: project.id,
      projectName: project.name,
      projectKind: kind,
      targetDay: input.targetDay,
      progress: input.progress ?? 0,
      note: emptyToNull(input.note),
      status: 'active',
      createdAt: new Date().toISOString(),
      closedAt: null,
      checkpoints: checkpoints(input.checkpoints ?? OPTIONS.defaults[kind], 0),
      entries: [],
      sprints: [],
    }

    goals = [...goals, goal]

    return view(goal)
  },

  async updateAgendaGoal(id, change) {
    await delay()

    const goal = mine(id)

    if (change.targetDay !== undefined) goal.targetDay = change.targetDay
    if (change.progress !== undefined) goal.progress = change.progress
    if (change.note !== undefined) goal.note = emptyToNull(change.note)
    if (change.status !== undefined && change.status !== goal.status) {
      goal.status = change.status
      goal.closedAt = change.status === 'active' ? null : new Date().toISOString()
    }

    return view(goal)
  },

  async removeAgendaGoal(id) {
    await delay()
    mine(id)
    goals = goals.filter((goal) => goal.id !== id)
  },

  async addAgendaCheckpoint(goalId, input) {
    await delay()

    const goal = mine(goalId)

    if ('key' in input) {
      if (!goal.checkpoints.some((each) => each.key === input.key)) {
        goal.checkpoints = [...goal.checkpoints, ...checkpoints([input.key], 0)]
      }
    } else {
      goal.checkpoints = [
        ...goal.checkpoints,
        { id: newId(), key: null, text: input.text.trim(), done: false },
      ]
    }

    return view(goal)
  },

  async markAgendaCheckpoint(goalId, checkpointId, done) {
    await delay()

    const goal = mine(goalId)

    goal.checkpoints = goal.checkpoints.map((each) =>
      each.id === checkpointId ? { ...each, done } : each,
    )

    return view(goal)
  },

  async removeAgendaCheckpoint(goalId, checkpointId) {
    await delay()

    const goal = mine(goalId)

    goal.checkpoints = goal.checkpoints.filter((each) => each.id !== checkpointId)

    return view(goal)
  },

  async saveAgendaEntry(goalId, input) {
    await delay()

    const goal = mine(goalId)

    saveEntry(goal, input)

    return view(goal)
  },

  async getSprintBoard(groupId) {
    await delay()

    const group = state.groups.find((each) => each.id === groupId)

    if (group === undefined) throw fail(404, 'Ese sprint no existe')
    if (!group.members.includes(ME.login)) {
      throw fail(403, 'Solo quien está en el sprint ve su tablero')
    }

    const own = goals.find(
      (goal) => goal.projectId === group.projectId && goal.status !== 'dropped',
    )
    const board: SprintBoard = {
      groupId,
      projectId: group.projectId,
      projectName: group.projectName,
      place: group.place,
      members: group.members.map((login) => {
        if (login !== ME.login) {
          return {
            login,
            image: null,
            goal: group.projectId === 1337 ? (sprintOthers[login] ?? null) : null,
          }
        }
        return { login, image: null, goal: own === undefined ? null : sprintGoalOf(own) }
      }),
    }

    return board
  },
}

/** Vuelve a lo de fábrica (al cerrar sesión, y entre tests). */
export function resetAgenda(): void {
  goals = initialGoals()
  sprintOthers = others()
}
