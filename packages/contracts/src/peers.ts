import type { PiscineGroup } from './graph.js'

/**
 * Estado de una persona respecto a un proyecto.
 *
 * - `in_progress`: lo está haciendo ahora, un "paciente como tú".
 * - `finished`: ya lo ha aprobado, un "especialista".
 */
export type ProjectStatus = 'in_progress' | 'finished'

/**
 * Cada elemento de `GET /me/projects`. A un piscinero le llegan todos los
 * proyectos de la piscina, en su orden, con su grupo (`docs/piscineros.md`):
 * `status` solo en los que tiene empezados o aprobados.
 */
export type ProjectSummary = {
  id: number
  name: string
  /** Solo con `?scope=all` (y siempre a un piscinero): distingue lo que haces de lo que ya aprobaste. */
  status?: ProjectStatus
  /** Solo a un piscinero: el grupo del proyecto en la piscina. */
  group?: PiscineGroup
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
  /**
   * `true` si ya lo aprobó y se ofrece a preevaluar proyectos terminados: una
   * corrección de prueba antes de la de verdad.
   */
  preReview: boolean
  /** En modo Pomodoro hasta esa hora (ISO): «concentrado, no me distraigas». `null` si no. */
  focusUntil: string | null
}

/** `GET` y `PUT /me/availability`. */
export type AvailabilityResponse = {
  available: boolean
}
