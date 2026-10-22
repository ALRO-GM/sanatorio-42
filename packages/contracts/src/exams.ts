/** Las estadísticas de un examen en un campus. */
export type ExamStat = {
  projectId: number
  name: string
  /** Personas que lo han intentado alguna vez, y las que lo han aprobado. */
  people: number
  passed: number
  /** Intentos que necesitó cada cual hasta aprobar, de media. `null` sin aprobados. */
  avgAttempts: number | null
  /** Cuántas personas aprobaron al 1.º, 2.º, 3.º, 4.º y 5.º intento o más. */
  attemptsToPass: [number, number, number, number, number]
  /** Por número de intento: cuánta gente lo hizo, la nota media y qué parte aprobó. */
  byAttempt: { attempt: number; people: number; avgMark: number | null; passRate: number }[]
}

/** Cuánto se tarda en completar un círculo, en días, sin los casos extremos. */
export type CircleDuration = {
  circle: number
  people: number
  median: number
  p25: number
  p75: number
}

/** `GET /exams/stats`: exámenes y círculos del campus que se mira. */
export type ExamStats = {
  exams: ExamStat[]
  circles: CircleDuration[]
  /** Por dónde va la copia de los intentos antiguos: exámenes completos de los que hay. */
  backfill: { done: number; total: number }
}

/** Alguien apuntado a un examen que está en marcha. */
export type LiveExaminee = {
  login: string
  image: string | null
  /** Plan de estudios: el clásico (todo en C) o el nuevo (con Python). */
  track: 'classic' | 'next'
  /** Círculo en que va, si se sabe. */
  circle: number | null
  /** La nota de su último intento en este examen, o `null` si aún no tiene. */
  mark: number | null
  /**
   * Cómo va en esta sesión: `pending` si aún no ha empezado, `inProgress` si
   * está dentro, `passed` si lo tiene cerrado con 100 o más y `failed` si lo
   * tiene cerrado sin llegar a 100.
   */
  status: 'pending' | 'inProgress' | 'passed' | 'failed'
}

/**
 * Un grupo de gente del examen en vivo: los que hacen el mismo examen. Es el
 * que ya han empezado o, si no, el que toca por el círculo en que van.
 */
export type LiveExamGroup = {
  /** El examen (proyecto), o `null` si no se sabe cuál le toca. */
  projectId: number | null
  name: string | null
  people: LiveExaminee[]
}

/** `GET /exams/live`: el examen que hay ahora en tu campus (o el siguiente, en las próximas 24 h). */
export type LiveExam = {
  exam: {
    id: number
    name: string
    location: string | null
    beginAt: string
    endAt: string
    /** El día en que empieza, contado en la hora del campus: hoy, mañana o más adelante. */
    when: 'today' | 'tomorrow' | 'later'
  } | null
  /** `true` si está en marcha ahora; `false` si es el siguiente. */
  running: boolean
  groups: LiveExamGroup[]
  /** Cuándo se miraron las notas por última vez. */
  updatedAt: string | null
  /** Con el examen en marcha: cuándo se vuelven a pedir solas (cada 5 minutos). */
  nextRefreshAt: string | null
  /**
   * Con el examen en marcha: desde cuándo se puede pedir otro refresco a mano.
   * Es uno por minuto para todo el campus, no por persona.
   */
  refreshableAt: string | null
}
