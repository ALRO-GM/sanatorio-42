/** Un grupo de terapia tal y como lo ve quien pregunta (`GET /groups`). */
export type GroupView = {
  id: number
  projectId: number
  projectName: string | null
  creator: string
  place: string
  /** Días concretos de quedada (`YYYY-MM-DD`, en la hora local del campus), en orden. */
  dates: string[]
  /** `HH:MM`, en la hora local del campus. */
  start: string
  end: string
  capacity: number
  note: string | null
  /** Puestos reservados para el grupo (`c1r2s4`). En el mapa salen en azul. */
  seats: string[]
  members: { login: string; image: string | null }[]
  /** `true` si quien pregunta está dentro. */
  joined: boolean
  /** `true` si es quien lo abrió (o modera) y puede cerrarlo. */
  mine: boolean
  /** `true` si ahora mismo es día y hora de quedada. */
  inSession: boolean
}

/** Cuerpo de `POST /groups`. */
export type GroupInput = {
  projectId: number
  place: string
  /** Días concretos (`YYYY-MM-DD`). De uno a catorce. */
  dates: string[]
  start: string
  end: string
  capacity?: number
  note?: string | null
  /** Puestos que reserva el grupo. Como mucho, tantos como plazas. */
  seats?: string[]
}
