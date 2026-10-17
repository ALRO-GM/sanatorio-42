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
  /** `true` si ese intento aprueba. */
  passed: boolean
}

/** Un grupo de gente del examen en vivo: los que hacen el mismo examen (o aún no se sabe). */
export type LiveExamGroup = {
  /** El examen (proyecto) que hacen, o `null` si aún no han entregado nada. */
  projectId: number | null
  name: string | null
  people: LiveExaminee[]
}

/** `GET /exams/live`: el examen que hay ahora en tu campus (o el siguiente, si es hoy). */
export type LiveExam = {
  exam: { id: number; name: string; location: string | null; beginAt: string; endAt: string } | null
  /** `true` si está en marcha ahora; `false` si es el siguiente de hoy. */
  running: boolean
  groups: LiveExamGroup[]
  /** Cuándo se miraron las notas por última vez. */
  updatedAt: string | null
}
