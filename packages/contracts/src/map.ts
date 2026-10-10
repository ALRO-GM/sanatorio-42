/** Por qué se resalta a alguien en el mapa: está de guardia para ese proyecto. */
export type SeatDuty =
  /** Lo está haciendo: "paciente como tú". Verde. */
  | 'patient'
  /** Ya lo aprobó: "especialista". Dorado. */
  | 'specialist'

/** Un puesto reservado por un grupo de terapia. Azul. */
export type SeatReservation = {
  groupId: number
  projectName: string | null
  /** Días de quedada: 1 = lunes … 7 = domingo. */
  days: number[]
  start: string
  end: string
  /** `true` si el grupo está reunido ahora mismo. */
  inSession: boolean
}

export type MapSeat = {
  /** Nombre del puesto en 42 (`c1r2s4`). */
  host: string
  /** Fila y posición dentro del cluster, empezando en 1. */
  row: number
  seat: number
  occupant: {
    login: string
    image: string | null
    /** `null` si no está de guardia para este proyecto. */
    duty: SeatDuty | null
    /** `true` si es quien pregunta. */
    me: boolean
  } | null
  reservation: SeatReservation | null
}

export type MapCluster = {
  /** Prefijo del puesto (`c1`). */
  id: string
  /** Tamaño de la cuadrícula: la fila y la posición más altas que se han visto. */
  rows: number
  seatsPerRow: number
  /**
   * Puestos que se conocen: ocupados ahora, vistos ocupados alguna vez o
   * reservados. El resto de la cuadrícula puede no existir.
   */
  seats: MapSeat[]
  occupied: number
  onDuty: number
}

/** `GET /projects/:id/map`: el campus que se mira, visto desde un proyecto. */
export type ClusterMap = {
  clusters: MapCluster[]
  /** Gente en puestos cuyo nombre no se sabe colocar en una cuadrícula. */
  unplaced: { host: string; login: string; duty: SeatDuty | null }[]
}
