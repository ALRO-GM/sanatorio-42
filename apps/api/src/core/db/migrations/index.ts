/**
 * Migraciones del esquema, en orden.
 *
 * Cada migración es inmutable: una vez desplegada no se edita, se añade otra
 * (`0004-lo-que-sea.ts`) y se apunta al final de esta lista. Cada fichero dice
 * de qué módulo son sus tablas.
 */

import { replicaSchema } from './0001-replica.js'
import { availabilitySchema } from './0002-availability.js'
import { communitySchema } from './0003-community.js'
import { mapSchema } from './0004-map.js'
import { helpSchema } from './0005-help.js'
import { agendaSchema } from './0006-agenda.js'
import { curriculumSchema } from './0007-curriculum.js'
import { therapyDatesSchema } from './0008-therapy-dates.js'
import { hoursAndLevelSchema } from './0009-hours-and-level.js'
import { cursusStartSchema } from './0010-cursus-start.js'
import { healthSchema } from './0011-health.js'
import type { Migration } from './types.js'

export type { Migration } from './types.js'

export const MIGRATIONS: readonly Migration[] = [
  replicaSchema,
  availabilitySchema,
  communitySchema,
  mapSchema,
  helpSchema,
  agendaSchema,
  curriculumSchema,
  therapyDatesSchema,
  hoursAndLevelSchema,
  cursusStartSchema,
  healthSchema,
]

/** Versión más alta que existe en el código. */
export const LATEST_VERSION: number = MIGRATIONS.reduce(
  (max, migration) => Math.max(max, migration.version),
  0,
)
