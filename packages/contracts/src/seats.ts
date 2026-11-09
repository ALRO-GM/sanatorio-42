/**
 * La red de asientos (`docs/asientos.md`): con quién se sienta cada cual en
 * los clústeres, sacado del historial de puestos. Cada unión es una cercanía:
 * horas sentados a la vez, multiplicadas por el peso de lo cerca que estaban.
 */

/** Una persona de la red de asientos. */
export type SeatPerson = {
  login: string
  image: string | null
  /** Horas sentada en un puesto, en el periodo. */
  hours: number
  /** Su cercanía con todos los demás, sumada. */
  closeness: number
  /** Personas distintas que se han sentado cerca. */
  partners: number
  /** Parte de sus horas (0-1) sin nadie en un puesto cercano. */
  alone: number
  /** Comunidad: `0` es la mayor. Gente que se sienta junta más de lo que tocaría por azar. */
  community: number
  /** Sus puestos de siempre, el más usado primero (hasta tres). */
  usual: string[]
}

/** Dos personas que se han sentado cerca. Sin dirección. */
export type SeatLink = {
  source: string
  target: string
  /** Horas a la vez por el peso de cada puesto (los del panel; de siempre, 3, 2 o 1,5), redondeado. */
  closeness: number
  /** Horas sentados cerca a la vez, sin pesos. */
  hours: number
}

/** `GET /network/seats?days=` */
export type SeatGraph = {
  /** Días que se miran hacia atrás desde hoy. */
  days: number
  people: SeatPerson[]
  links: SeatLink[]
  totals: {
    people: number
    pairs: number
    communities: number
    /** Horas de puesto que se han mirado, de todos. */
    hours: number
  }
}

/** Un puesto del mapa de calor. */
export type SeatHeatCell = {
  host: string
  row: number
  seat: number
  /** Horas de uso en el periodo, con un decimal. `0` si nadie se ha sentado. */
  hours: number
  /** Personas distintas que se han sentado en él. */
  people: number
}

/** Un clúster del mapa de calor: la cuadrícula entera, `rows` × `seatsPerRow`. */
export type SeatHeatCluster = {
  id: string
  rows: number
  seatsPerRow: number
  /** Horas de uso de todo el clúster en el periodo, con un decimal. */
  hours: number
  /** Personas distintas que se han sentado en el clúster (no la suma de sus puestos). */
  people: number
  /** Ordenados por fila y puesto. */
  cells: SeatHeatCell[]
}

/**
 * `GET /network/seats/heat?days=`: cuánto se ha usado cada ordenador, medido
 * igual que la red de asientos y solo con la gente que quien mira puede ver.
 */
export type SeatHeat = {
  days: number
  clusters: SeatHeatCluster[]
  /** Las horas del puesto más usado, para la escala de colores. */
  max: number
  /**
   * Hasta cuándo están sumadas las horas (ISO): se ponen al día cada hora.
   * `null` mientras se suma el historial por primera vez y se cuenta al momento.
   */
  through: string | null
}

/**
 * Los pesos de los puestos (`GET /admin/seat-weights`): tres filas (delante,
 * la suya, atrás) de siete puestos, del tercero a la izquierda al tercero a la
 * derecha, vistos desde un puesto norte. El centro es la propia persona.
 */
export type SeatWeightsState = {
  grid: number[][]
  /** Los de siempre, para volver a ellos. */
  defaults: number[][]
  /** Quién los cambió por última vez y cuándo; `null` si son los de siempre. */
  updatedBy: string | null
  updatedAt: string | null
}

/** Lo bien que separan unos pesos a la gente en grupos. */
export type SeatGroupQuality = {
  /** Modularidad de los grupos (de −0,5 a 1): más alta, grupos más nítidos. */
  modularity: number
  /** Grupos de dos o más personas. */
  communities: number
  /** Parte de la gente (0-1) que está en un grupo de dos o más. */
  grouped: number
  /** Parte de la cercanía (0-1) que queda dentro de los grupos. */
  inside: number
  /** Parte de la gente (0-1) en el grupo más grande: muy alta es una sola bola. */
  largest: number
  /** Parejas que se unen en el grafo. */
  pairs: number
}

/** `POST /admin/seat-weights/preview`: cómo saldría la red con otros pesos. */
export type SeatWeightsPreview = {
  graph: SeatGraph
  /** Con los pesos que se prueban. */
  proposed: SeatGroupQuality
  /** Con los que están en uso, en el mismo periodo. */
  current: SeatGroupQuality
}
