/** La startup del Pomodoro (`docs/pomodoro-startup.md`). Las reglas, en `@sanatorio/startup`. */

/** Los cinco modelos de negocio: apps, plataforma, datos, IA y nube. */
export type StartupAxis = 'front' | 'back' | 'data' | 'ai' | 'infra'

export type StartupHire = { axis: StartupAxis; stars: number; look: number }

/** La partida, como la guarda la API (`StartupState` de `@sanatorio/startup`). */
export type StartupStateDto = {
  name: string | null
  levels: Record<string, number>
  milestones: string[]
  team: StartupHire[]
  rounds: { id: string; luck: number }[]
  spent: number
  rolls: number
}

/** `GET /me/startup` y `POST /me/startup/action`: la partida y los minutos ganados. */
export type StartupSnapshot = {
  /** De quién es: su aspecto en el dibujo sale de aquí. */
  login: string
  state: StartupStateDto
  earnedMinutes: number
}

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
