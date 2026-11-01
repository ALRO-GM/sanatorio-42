/** La startup del Pomodoro (`docs/pomodoro-startup.md`). Las reglas, en `@sanatorio/startup`. */

/** Los cinco modelos de negocio: apps, plataforma, datos, IA y nube. */
export type StartupAxis = 'front' | 'back' | 'data' | 'ai' | 'infra'

/** El resto de la oficina, que no programa (`ROLES` de `@sanatorio/startup`). */
export type StartupRole =
  'reception' | 'cleaning' | 'delivery' | 'kitchen' | 'security' | 'maintenance'

export type StartupHire = { axis: StartupAxis; stars: number; look: number; role?: StartupRole }

/** Una pieza de decoración: dónde está (`null`, guardada) y si está girada. */
export type StartupPlaced = { id: string; at: readonly [number, number] | null; turn: boolean }

/** La partida, como la guarda la API (`StartupState` de `@sanatorio/startup`). */
export type StartupStateDto = {
  name: string | null
  levels: Record<string, number>
  milestones: string[]
  team: StartupHire[]
  rounds: { id: string; luck: number }[]
  spent: number
  rolls: number
  /** El dinero apuntado y los minutos ganados cuando se apuntó (`null`: nunca). */
  cash: number
  at: number | null
  decor: StartupPlaced[]
  /** Cajas sorpresa abiertas y vueltas terminadas (nueva partida+). */
  opened: number
  legacy: number
}

/** `GET /me/startup` y `POST /me/startup/action`: la partida y los minutos ganados. */
export type StartupSnapshot = {
  /** De quién es: su aspecto en el dibujo sale de aquí. */
  login: string
  state: StartupStateDto
  earnedMinutes: number
  /** Sesiones del Pomodoro de 30 minutos o más, en total: una caja sorpresa cada una. */
  longSessions: number
}

/** `GET /startup/office/:login`: la oficina de otra persona, para ir a verla. */
export type StartupVisit = { login: string; state: StartupStateDto }

/** Una fila de `GET /startup/ranking`. */
export type StartupRankRow = {
  login: string
  name: string | null
  /** Horas de concentración en total. */
  hours: number
  valuation: number
  /** 0 garaje … 7 control global. */
  stage: number
  focus: StartupAxis | null
  team: number
}
