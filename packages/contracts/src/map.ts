import type { TitleId } from './profile.js'

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
  /** Días concretos de quedada (`YYYY-MM-DD`). */
  dates: string[]
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
    /** Proyectos que tiene en curso, por nombre. */
    projects: string[]
    /** `null` si no está de guardia para este proyecto. */
    duty: SeatDuty | null
    /** `true` si es quien pregunta. */
    me: boolean
    /** `true` si tiene Sanatorio abierto ahora: se le puede escribir y lo verá. */
    online: boolean
    /** El círculo del common core en que va (0 a 6), si se sabe. */
    circle: number | null
    /** En modo Pomodoro hasta esa hora (ISO), o `null`. */
    focusUntil: string | null
    /**
     * La mejor nota con la que aprobó alguno de los proyectos que tiene en curso
     * quien mira (125 es la máxima), o `null` si no aprobó ninguno.
     */
    finishedMine: number | null
  } | null
  /**
   * Hay alguien sentado a quien quien mira no puede ver (a un piscinero, los
   * estudiantes; a cualquiera, los ocultos a su grupo): sale ocupado, sin
   * nombre ni foto. Con `occupant`, siempre `false`.
   */
  taken: boolean
  reservation: SeatReservation | null
  /**
   * Si alguien ha avisado de que no funciona (vale una semana): quién y
   * cuándo. Un puesto roto no se propone para una terapia.
   */
  broken: { by: string; at: string } | null
}

export type MapCluster = {
  /** Prefijo del puesto (`c1`). */
  id: string
  /** Tamaño de la cuadrícula: la fila y la posición más altas que se han visto. */
  rows: number
  seatsPerRow: number
  /**
   * Todos los puestos de la cuadrícula (`rows` × `seatsPerRow`), ocupados o
   * libres. El plano se deduce de los puestos en los que se ha visto a alguien,
   * así que alguna casilla puede corresponder a un pasillo.
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
  /** Quien mira: su círculo y sus proyectos en curso, para resaltar a quien comparte algo. */
  me: { circle: number | null; projects: string[] }
}

/**
 * `GET /people/:login/card`: la ficha que sale al pasar el ratón por un login
 * en cualquier parte de la web (la misma información que la de un puesto).
 */
export type PersonCard = {
  login: string
  image: string | null
  /** Dónde está sentado ahora en el campus que se mira, o `null`. */
  seat: string | null
  circle: number | null
  /** Proyectos en curso, por nombre. */
  projects: string[]
  /** De guardia: disponible y sentado. */
  onDuty: boolean
  /** Tiene Sanatorio abierto ahora. */
  online: boolean
  /** Es quien pregunta. */
  me: boolean
  /** En modo Pomodoro hasta esa hora (ISO): «concentrado, no me distraigas». */
  focusUntil: string | null
  /** El título que luce, que decide el banner de la ficha; `null` si no se sabe. */
  title: TitleId | null
}

/** Qué tipo de problema del edificio o de los ordenadores es (#77 del buzón). */
export type FacilityCategory =
  'computer' | 'peripheral' | 'network' | 'toilets' | 'temperature' | 'light' | 'cleaning' | 'other'

/** Cuerpo de `POST /facility/reports`. Sin `place`, el puesto en el que estás. */
export type FacilityReportInput = {
  category: FacilityCategory
  place?: string
  note?: string
}

/** Un aviso, como lo ven el staff y quien administra. */
export type FacilityReport = {
  id: number
  campusId: number
  campusName: string
  login: string
  category: FacilityCategory
  place: string
  note: string | null
  createdAt: string
  resolvedAt: string | null
  resolvedBy: string | null
}
