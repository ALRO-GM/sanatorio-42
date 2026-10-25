/**
 * Agenda: un Scrum individual alrededor de tus proyectos del cursus
 * (`docs/agenda.md`). Te pones una meta (entregar un proyecto antes de un
 * día), con su avance y sus checkpoints, y apuntas dailies y weeklies: qué vas
 * a hacer, si lo hiciste y, si no, por qué. Casi todo se elige de listas, para
 * que los datos salgan limpios.
 *
 * Las listas son cerradas: la API y la web tienen cada una la suya, con todas
 * estas claves (TypeScript lo exige).
 */

import type { CalendarEvent } from './calendar.js'

/** Tipo de proyecto, deducido de su nombre: de él salen los checkpoints de fábrica. */
export type AgendaProjectKind = 'c' | 'graphics' | 'cpp' | 'python' | 'sysadmin' | 'exam' | 'other'

/** Los checkpoints de la lista. Uno propio va con `key: null` y su `text`. */
export type AgendaCheckpointKey =
  /** El código funciona. */
  | 'works'
  /** El subject está cubierto entero. */
  | 'subject'
  /** La hoja de corrección está repasada. */
  | 'sheet'
  /** Pasa la norminette. */
  | 'norminette'
  /** Sin leaks ni segfaults (valgrind, sanitizers). */
  | 'leaks'
  /** Varios peers han intentado romperlo. */
  | 'breakers'
  /** El repo de git está limpio y subido. */
  | 'git'
  /** Las franjas de corrección están reservadas. */
  | 'slots'
  /** Compila con `-Wall -Wextra -Werror` (y `-std=c++98` en C++). */
  | 'flags'
  /** Forma canónica ortodoxa en cada clase (C++). */
  | 'canonical'
  /** Pasa flake8 y mypy (Python). */
  | 'pytools'
  /** Los tests pasan. */
  | 'tests'
  /** Se monta desde cero sin tocar nada a mano (máquinas, contenedores). */
  | 'rebuild'
  /** Aguanta entradas malas: mapas rotos, argumentos raros. */
  | 'inputs'
  /** La ventana se cierra limpia (ESC y la cruz). */
  | 'window'
  /** Has practicado todos los niveles del examen. */
  | 'practice'
  /** Has hecho un simulacro con el reloj en marcha. */
  | 'mock'
  /** Estás apuntado al examen en la intra. */
  | 'registered'

/** Lo que más atasca. `other` lleva su texto. */
export type AgendaProblem =
  | 'concept'
  | 'bug'
  | 'memory'
  | 'norminette'
  | 'subject'
  | 'time'
  | 'motivation'
  | 'waiting'
  | 'cluster_full'
  | 'failed_eval'
  | 'personal'
  | 'other'

/** Cómo podrías desatascarte. `other` lleva su texto. */
export type AgendaSolution =
  | 'peer2peer'
  | 'book_help'
  | 'pair'
  | 'sprint'
  | 'whiteboard'
  | 'docs'
  | 'debugger'
  | 'split'
  | 'rest'
  | 'other'

/** Si hiciste lo que te propusiste. */
export type AgendaOutcome = 'done' | 'partial' | 'not_done'

/** `daily`: un día · `weekly`: una semana (el día es su lunes). */
export type AgendaEntryKind = 'daily' | 'weekly'

/** `active`: en marcha · `done`: lo entregaste · `dropped`: lo dejaste. */
export type AgendaGoalStatus = 'active' | 'done' | 'dropped'

export type AgendaCheckpoint = {
  id: number
  /** De la lista, o `null` si es uno propio. */
  key: AgendaCheckpointKey | null
  /** El propio; `null` en los de la lista (el texto lo pone la web). */
  text: string | null
  done: boolean
}

/** Un daily o un weekly de una meta. Uno por día (o semana) y meta: se reescribe. */
export type AgendaEntry = {
  id: number
  kind: AgendaEntryKind
  /** `YYYY-MM-DD`: el día del daily o el lunes de la semana del weekly. */
  day: string
  /** Los checkpoints que te propusiste (sus `id`). */
  plan: number[]
  /** `null` mientras no lo cierres. */
  outcome: AgendaOutcome | null
  problem: AgendaProblem | null
  /** Solo con `problem: "other"`. */
  problemOther: string | null
  solution: AgendaSolution | null
  /** Solo con `solution: "other"`. */
  solutionOther: string | null
  /** Cómo llevas el proyecto al apuntarlo (0-100), si lo dijiste. */
  progress: number | null
  note: string | null
  updatedAt: string
}

/** Un sprint (grupo de terapia) tuyo del mismo proyecto que la meta. */
export type AgendaSprintRef = {
  groupId: number
  place: string
  /** Cuánta gente hay dentro, contigo. */
  members: number
}

export type AgendaGoal = {
  id: number
  projectId: number
  projectName: string
  projectKind: AgendaProjectKind
  /** El día para el que te lo pones (`YYYY-MM-DD`, hora del campus). */
  targetDay: string
  /** Cuánto llevas, de 0 a 100 (de 5 en 5). */
  progress: number
  /** Lo que te queda, en pocas palabras. */
  note: string | null
  status: AgendaGoalStatus
  createdAt: string
  closedAt: string | null
  checkpoints: AgendaCheckpoint[]
  /** Los últimos dailies y weeklies, lo más reciente primero (como mucho 14). */
  entries: AgendaEntry[]
  /** Tus sprints de ese proyecto: ahí lo ve tu grupo. */
  sprints: AgendaSprintRef[]
}

/** Un proyecto que se puede elegir para una meta. */
export type AgendaProject = {
  id: number
  name: string
  /** `in_progress`: lo tienes en marcha · `next`: lo siguiente de tu plan. */
  status: 'in_progress' | 'next'
  kind: AgendaProjectKind
  /** Su círculo en tu plan, si se sabe. */
  circle: number | null
}

/**
 * Las listas cerradas, en su orden, y los checkpoints de fábrica de cada tipo
 * de proyecto. Las da la API para que haya una sola fuente; la web solo pone
 * el texto de cada clave.
 */
export type AgendaOptions = {
  checkpoints: AgendaCheckpointKey[]
  problems: AgendaProblem[]
  solutions: AgendaSolution[]
  defaults: Record<AgendaProjectKind, AgendaCheckpointKey[]>
}

/** `GET /agenda`. */
export type AgendaView = {
  /** Hoy en tu campus (`YYYY-MM-DD`). */
  today: string
  /** Lo activo, y lo cerrado en los últimos 30 días. */
  goals: AgendaGoal[]
  projects: AgendaProject[]
  /** Lo de 42 a lo que vas en los próximos 14 días: eventos, exámenes y correcciones. */
  events: CalendarEvent[]
  options: AgendaOptions
}

/** Cuerpo de `POST /agenda/goals`. */
export type AgendaGoalInput = {
  projectId: number
  targetDay: string
  progress?: number
  note?: string | null
  /** Sin ellos, los de fábrica del tipo de proyecto. */
  checkpoints?: AgendaCheckpointKey[]
}

/** Cuerpo de `PUT /agenda/goals/:id`: solo lo que cambia. */
export type AgendaGoalUpdate = {
  targetDay?: string
  progress?: number
  note?: string | null
  status?: AgendaGoalStatus
}

/** Cuerpo de `POST /agenda/goals/:id/checkpoints`. */
export type AgendaCheckpointInput = { key: AgendaCheckpointKey } | { text: string }

/** Cuerpo de `POST /agenda/goals/:id/entries`. */
export type AgendaEntryInput = {
  kind: AgendaEntryKind
  day: string
  plan?: number[]
  outcome?: AgendaOutcome | null
  problem?: AgendaProblem | null
  problemOther?: string | null
  solution?: AgendaSolution | null
  solutionOther?: string | null
  progress?: number | null
  note?: string | null
}

/** Dónde se atascó alguien: lo último que apuntó con un problema. */
export type SprintBlocker = {
  day: string
  problem: AgendaProblem
  problemOther: string | null
  solution: AgendaSolution | null
  solutionOther: string | null
}

/** La meta de una persona del sprint, vista por el resto del grupo. */
export type SprintGoal = {
  id: number
  targetDay: string
  progress: number
  status: AgendaGoalStatus
  note: string | null
  checkpoints: AgendaCheckpoint[]
  /** Checkpoints hechos y totales. */
  done: number
  total: number
  /** El primer checkpoint sin hacer: por dónde va. */
  stuckOn: AgendaCheckpoint | null
  /** Lo último que apuntó con un problema, si el último daily o weekly lo tiene. */
  blocker: SprintBlocker | null
  /** Sus últimos dailies y weeklies, lo más reciente primero (como mucho 5). */
  entries: AgendaEntry[]
}

/** `GET /agenda/sprints/:id`: el tablero del sprint, solo para quien está dentro. */
export type SprintBoard = {
  groupId: number
  projectId: number
  projectName: string | null
  place: string
  members: {
    login: string
    image: string | null
    /** `null` si aún no tiene meta de ese proyecto en su agenda. */
    goal: SprintGoal | null
  }[]
}
