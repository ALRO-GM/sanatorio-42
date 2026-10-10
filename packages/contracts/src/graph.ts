/** Cómo va quien pregunta con un proyecto del grafo. */
export type GraphStatus =
  /** No lo ha empezado. Gris. */
  | 'todo'
  /** Lo está haciendo. Blanco. */
  | 'in_progress'
  /** Lo aprobó. Turquesa. */
  | 'finished'

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
  /** Identificador estable del proyecto en el grafo (`push_swap`). */
  key: string
  name: string
  /** Nombre corto, para que quepa dentro del nodo. */
  short: string
  /** Id del proyecto en 42, o `null` si todavía no está en la réplica. */
  projectId: number | null
  status: GraphStatus
  signals: GraphSignals
}

/** `GET /doubts/graph`: el common core por círculos, del 0 al 6. */
export type HolyGraph = {
  circles: { circle: number; projects: GraphProject[] }[]
}
