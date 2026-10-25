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
  /** Horas a la vez por el peso de cada puesto (3, 2 o 1,5), redondeado. */
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
