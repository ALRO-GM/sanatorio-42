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
import { correctionsSchema } from './0012-corrections.js'
import { verdictsSchema } from './0013-verdicts.js'
import { usageSchema } from './0014-usage.js'
import { meetSchema } from './0015-meet.js'
import { adminSchema } from './0016-admin.js'
import { therapyReviewSchema } from './0017-therapy-review.js'
import { attendanceSchema } from './0018-attendance.js'
import { settingsSchema } from './0019-settings.js'
import { quotaSchema } from './0020-quota.js'
import { messageRateSchema } from './0021-message-rate.js'
import { noticesSchema } from './0022-notices.js'
import { eventAlertsSchema } from './0023-event-alerts.js'
import { paceRefSchema } from './0024-pace-ref.js'
import { usageTimeSchema } from './0025-usage-time.js'
import { broadcastsSchema } from './0026-broadcasts.js'
import { clickerSchema } from './0027-clicker.js'
import { clickerRevSchema } from './0028-clicker-rev.js'
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
  correctionsSchema,
  verdictsSchema,
  usageSchema,
  meetSchema,
  adminSchema,
  therapyReviewSchema,
  attendanceSchema,
  settingsSchema,
  quotaSchema,
  messageRateSchema,
  noticesSchema,
  eventAlertsSchema,
  paceRefSchema,
  usageTimeSchema,
  broadcastsSchema,
  clickerSchema,
  clickerRevSchema,
]

/** Versión más alta que existe en el código. */
export const LATEST_VERSION: number = MIGRATIONS.reduce(
  (max, migration) => Math.max(max, migration.version),
  0,
)
