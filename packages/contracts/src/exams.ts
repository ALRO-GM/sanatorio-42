/** De qué plan es un examen: los Exam Rank del clásico (en C) o los de Nexus (del nuevo, en Python). */
export type ExamFamily = 'classic' | 'next'

/** Las estadísticas de un examen en un campus. */
export type ExamStat = {
  projectId: number
  name: string
  family: ExamFamily
  /** El número del rango (`exam-rank-03` → 3), para poner juntos el 3 de C y el 3 de Nexus. */
  rank: number | null
  /** Personas que lo han intentado alguna vez, y las que lo han aprobado. */
  people: number
  passed: number
  /** Intentos que necesitó cada cual hasta aprobar, de media. `null` sin aprobados. */
  avgAttempts: number | null
  /**
   * Cuántas personas aprobaron al 1.er intento, al 2.º… sin tope: la posición `i`
   * es el intento `i + 1`. Quien aprobó en una fila antigua sin el número de
   * reintentos cuenta en `passed` pero no aquí.
   */
  attemptsToPass: number[]
  /** Por número de intento, todos: cuánta gente lo hizo, la nota media y qué parte aprobó. */
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

/** El plan del common core que se mira: los dos, el clásico (C) o el nuevo (Python). */
export type ExamTrack = 'all' | 'classic' | 'next'

/** Lo que se elige en `GET /exams/stats`: plan y kickoffs (`AAAA-MM`; vacío, todas). */
export type ExamQuery = { track: ExamTrack; kickoffs: string[] }

/** Una kickoff (mes en que se empezó el common core) y cuánta gente de cada plan entró. */
export type ExamKickoff = { month: string; classic: number; next: number }

/** Una kickoff de las elegidas, para compararlas: su gente, sus exámenes y su black hole. */
export type ExamKickoffRow = {
  month: string
  people: number
  /** Por examen: cuánta gente de esta kickoff lo intentó y cuánta lo aprobó. */
  exams: { projectId: number; people: number; passed: number }[]
  /** Gente de la que se sabe el black hole, y cuánta ha absorbido. */
  known: number
  absorbed: number
}

/** Alguien absorbido por el black hole o cerca de él. */
export type BlackHolePerson = {
  login: string
  image: string | null
  /** Cuándo la absorbió (o la absorberá). */
  at: string
  /** El círculo en que estaba (o está), si se sabe. */
  circle: number | null
  kickoff: string | null
  track: 'classic' | 'next'
}

/** El black hole de la gente elegida. Solo cuenta quien tiene la fecha (ha entrado en la web). */
export type BlackHoleStats = {
  known: number
  absorbed: number
  /** Por círculo: cuánta gente llegó a él (de la que se sabe) y cuánta absorbió allí. */
  circles: { circle: number; reached: number; absorbed: number }[]
  /** Absorbidos de cada mes (`AAAA-MM`), del más antiguo al más reciente. */
  months: { month: string; absorbed: number }[]
  /** Cuánta gente tiene el black hole a 7, 30 y 90 días o menos. */
  soon: { days: number; people: number }[]
  /** Los últimos absorbidos, del más reciente al más antiguo (como mucho 50). */
  recent: BlackHolePerson[]
  /** Quien lo tiene más cerca, de menos a más tiempo (como mucho 20). */
  closest: BlackHolePerson[]
}

/** `GET /exams/stats`: exámenes, círculos y black hole del campus que se mira. */
export type ExamStats = {
  exams: ExamStat[]
  circles: CircleDuration[]
  /** Por dónde va la copia de los intentos antiguos: exámenes completos de los que hay. */
  backfill: { done: number; total: number }
  /** Lo que se ha elegido, ya validado. */
  query: ExamQuery
  /** Gente del campus de la selección (plan y kickoffs). */
  people: number
  /** Todas las kickoffs del campus, de la más reciente a la más antigua, para elegir. */
  kickoffs: ExamKickoff[]
  /** Las kickoffs elegidas (o todas), de la más reciente a la más antigua. */
  byKickoff: ExamKickoffRow[]
  blackHole: BlackHoleStats
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
