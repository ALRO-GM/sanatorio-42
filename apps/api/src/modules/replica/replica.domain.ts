/**
 * Constantes de dominio de la réplica.
 */

import type { ProjectStatus } from '@sanatorio/contracts'

/** Estado de una persona respecto a un proyecto. */
export const PROJECT_STATUS = {
  /** Lo está haciendo ahora mismo: un "paciente como tú". */
  IN_PROGRESS: 'in_progress',
  /** Ya lo ha aprobado: un "especialista". */
  FINISHED: 'finished',
} as const satisfies Record<string, ProjectStatus>

/**
 * Antigüedad máxima de la foto de puestos de un campus para seguir creyéndola.
 *
 * Los puestos se piden de golpe para todo el campus
 * (`/campus/:id/locations?filter[active]=true`) cada dos minutos con gente en la
 * web y cada quince en reposo. Con media hora de margen, un puesto se da por
 * perdido solo si de verdad hemos dejado de mirar.
 */
export const LOCATION_MAX_AGE_MS = 30 * 60_000
