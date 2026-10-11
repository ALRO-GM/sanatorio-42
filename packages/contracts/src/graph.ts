/** Cómo va quien pregunta con un proyecto del grafo. */
export type GraphStatus =
  /** No lo ha empezado. */
  | 'todo'
  /** Lo está haciendo. */
  | 'in_progress'
  /** Lo aprobó. */
  | 'finished'

/**
 * Plan de estudios que sigue una persona: el clásico, todo en C, o el nuevo,
 * que tras los primeros proyectos en C pasa a Python.
 */
export type GraphTrack = 'classic' | 'next'

/**
 * Dónde hace falta una mano en el tablón de un proyecto.
 *
 * Solo llega lo que le sirve a quien pregunta: quien aprobó el proyecto ve las
 * tres cosas (puede responder como especialista y mantiene la guía); quien lo
 * está haciendo, solo las dudas sin responder; quien no ha llegado, nada.
 */
export type GraphSignals = {
  /** Dudas de otras personas, sin resolver y sin ninguna respuesta. */
  unanswered: number
  /** Cambios propuestos a la guía, pendientes de revisar. */
  proposals: number
  /** `true` si el proyecto todavía no tiene guía en este campus. */
  missingGuide: boolean
}

export type GraphProject = {
  /** Id del proyecto en 42. */
  projectId: number
  name: string
  /** Nombre corto, para que quepa dentro del nodo. */
  short: string
  status: GraphStatus
  /** `true` si lo aprobó con la nota máxima, 125. */
  perfect: boolean
  /** Horas que 42 estima para el proyecto, o `null` si no se sabe. Da el tamaño de su burbuja. */
  hours: number | null
  /**
   * Serie a la que pertenece, si es uno de varios módulos numerados (`"Python"`
   * para los `Python Module NN`, `"CPP"` para los `CPP Module NN`). Los de una
   * misma serie se pueden agrupar en una sola burbuja.
   */
  series: string | null
  /** `true` si aún no lo tiene disponible: es de un círculo al que no ha llegado. */
  locked: boolean
  signals: GraphSignals
}

/**
 * `GET /doubts/graph`: los proyectos del common core que quien pregunta tiene o
 * tendrá disponibles, según su plan, por círculos.
 */
export type HolyGraph = {
  track: GraphTrack
  /** Nivel en el 42cursus (`3.66`), o `null` si no se sabe. */
  level: number | null
  /**
   * Cuándo empezó el 42cursus (ISO-8601), o `null` si no se sabe. De ahí se
   * cuentan los días límite de cada círculo según el *pace* que lleve.
   */
  startedAt: string | null
  /** Círculo en el que está: el siguiente al último que completó. */
  currentCircle: number
  /**
   * Hasta qué círculo se conoce su plan. Si es menor que 6, lo que viene
   * después aún no se sabe: se irá dibujando cuando alguien del campus llegue.
   */
  knownUpTo: number
  /** Del círculo 0 al último conocido. Los proyectos, por nombre. */
  circles: { circle: number; projects: GraphProject[] }[]
}
