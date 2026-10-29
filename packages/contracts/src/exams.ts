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
  /** Por número de intento, todos: cuánta gente lo hizo, la nota mediana y qué parte aprobó. */
  byAttempt: { attempt: number; people: number; medianMark: number | null; passRate: number }[]
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

/** `GET /exams/stats`: exámenes y círculos del campus que se mira. */
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
}

/** Alguien apuntado a un examen que está en marcha. */
export type LiveExaminee = {
  login: string
  image: string | null
  /** Plan de estudios: el clásico (todo en C) o el nuevo (con Python). */
  track: 'classic' | 'next'
  /** Círculo en que va, si se sabe. */
  circle: number | null
  /** La nota de su intento de esta sesión, cuando se cierra; `null` mientras tanto. */
  mark: number | null
  /**
   * La mejor nota que ha sacado en ese examen, contando la de esta sesión si ya
   * está cerrada; `null` si nunca lo ha cerrado.
   */
  bestMark: number | null
  /**
   * Cómo va en esta sesión: `pending` si aún no ha empezado (con el examen en
   * marcha no sale: solo se ve a quien ha entrado), `inProgress` si
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

/**
 * El último examen acabado (de las dos últimas semanas) con los resultados de
 * quien entró, para revisarlos después: no desaparece al acabar.
 */
export type LiveExamResults = {
  exam: { id: number; name: string; location: string | null; beginAt: string; endAt: string }
  groups: LiveExamGroup[]
  /** Cuándo se miraron las notas por última vez. */
  updatedAt: string | null
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
  /** Sin examen en marcha, el último que acabó; `null` con uno en marcha o si no hay. */
  last: LiveExamResults | null
}
