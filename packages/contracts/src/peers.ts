/**
 * Estado de una persona respecto a un proyecto.
 *
 * - `in_progress`: lo está haciendo ahora, un "paciente como tú".
 * - `finished`: ya lo ha aprobado, un "especialista".
 */
export type ProjectStatus = 'in_progress' | 'finished'

/** Cada elemento de `GET /me/projects`. */
export type ProjectSummary = {
  id: number
  name: string
  /** Solo con `?scope=all`: distingue lo que haces de lo que ya aprobaste. */
  status?: ProjectStatus
}

/**
 * Cada elemento de `GET /projects/:id/peers`.
 *
 * Solo llegan los accionables (de guardia o en curso). El total va en la
 * cabecera `X-Total-Participants`.
 */
export type Peer = {
  login: string
  image: string | null
  /**
   * Puesto en el cluster (`"c2r17s2"`), o `null`.
   *
   * `null` significa que no está en el campus, o que la última foto de puestos
   * es tan vieja que es mejor no afirmarlo.
   */
  location: string | null
  /** De guardia. Lo pone Sanatorio, no la API de 42. */
  available: boolean
  status: ProjectStatus
  /**
   * `true` si lo aprobó con la nota máxima, 125: todo el proyecto y todos los
   * bonus. Es más que especialista: una "eminencia".
   */
  perfect: boolean
}

/** `GET` y `PUT /me/availability`. */
export type AvailabilityResponse = {
  available: boolean
}
