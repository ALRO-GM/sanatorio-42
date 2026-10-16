export type GroupKind = 'study' | 'review'

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
  /** Cada persona, con cómo llevaba el proyecto al apuntarse (0-100), si lo dijo. */
  members: { login: string; image: string | null; progress: number | null }[]
  /**
   * `study`: para sacar el proyecto adelante · `review`: de quien ya lo tiene
   * terminado y queda para repasarlo y buscarle fallos antes de presentarlo.
   */
  kind: GroupKind
  /** `true` si quien pregunta está dentro. */
  joined: boolean
  /** `true` si es quien lo abrió: solo esa persona lo cambia. */
  mine: boolean
  /** `true` si puede cerrarlo: quien lo abrió, o quien modera (para retirarlo). */
  canClose: boolean
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
  /** Solo cuenta si no se eligen puestos: con puestos, las plazas son los puestos. */
  capacity?: number
  note?: string | null
  /**
   * Puestos que reserva el grupo: de dos a seis, en el mismo cluster y sin más
   * de dos filas entre el primero y el último. De ellos salen las plazas.
   */
  seats?: string[]
  kind?: GroupKind
  /** Cómo lleva el proyecto quien abre el grupo, de 0 a 100. */
  progress?: number
}

/** Cuerpo de `POST /groups/:id/join`. */
export type JoinInput = {
  /** Cómo llevas el proyecto, de 0 a 100. En un grupo de repaso tiene que ser 100. */
  progress?: number
}
