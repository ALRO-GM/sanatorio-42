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
 * Qué grafo es: el del common core (por círculos) o el de la piscina
 * (`docs/piscineros.md`), que es lo que ve un piscinero.
 */
export type GraphKind = 'core' | 'piscine'

/**
 * Los grupos de proyectos de la piscina (C Piscine), como en su grafo de la
 * intra: Shell 00 y 01 (azul claro), C 00 a C 13 (azul oscuro), que son los que
 * cuentan para el avance, y aparte los rushes y BSQ (en grupo, el fin de
 * semana) y los exámenes, que no cuentan pero se pueden elegir para pedir ayuda.
 */
export type PiscineGroup = 'shell' | 'c' | 'rush' | 'exam'

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
  /**
   * Grupo de «elige uno» al que pertenece (`"circle2-graphics"` para so_long,
   * FdF y fract-ol), o `null`. Del grupo basta con aprobar uno: el círculo se
   * cuenta con un solo hueco por grupo.
   */
  choice: string | null
  /** `true` si aún no lo tiene disponible: es de un círculo al que no ha llegado. */
  locked: boolean
  /** Veces que quien pregunta ha corregido este proyecto (en cualquier campus). */
  corrected: number
  /**
   * `true` si en su campus nadie lo ha corregido en el último año: se da por
   * retirado y no cuenta para el grafo de correcciones.
   */
  retired: boolean
  signals: GraphSignals
  /** En el grafo de la piscina, su grupo; en el del common core, `null`. */
  group: PiscineGroup | null
}

/**
 * `GET /doubts/graph`: los proyectos del common core que quien pregunta tiene o
 * tendrá disponibles, según su plan, por círculos.
 *
 * A un piscinero, el de la piscina (`kind: 'piscine'`): dos «círculos», el 0
 * con los proyectos que cuentan para el avance, en orden (Shell 00 … C 13), y
 * el 1 con los de aparte (rushes, BSQ y exámenes). `track` no dice nada,
 * `level` es `null`, `startedAt` es el inicio de su piscina y
 * `currentCircle` y `knownUpTo` son `1`.
 */
export type HolyGraph = {
  kind: GraphKind
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
