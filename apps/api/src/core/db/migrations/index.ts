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
import { clickerCaughtSchema } from './0029-clicker-caught.js'
import { clickerCapitalSchema } from './0030-clicker-capital.js'
import { usageFlowsSchema } from './0031-usage-flows.js'
import { tourSpeedSchema } from './0032-tour-speed.js'
import { staffSchema } from './0033-staff.js'
import { conversationsSchema } from './0034-conversations.js'
import { evaluationMissedSchema } from './0035-evaluation-missed.js'
import { settledTicketsSchema } from './0036-settled-tickets.js'
import { curriculumVotesSchema } from './0037-curriculum-votes.js'
import { ticketCategorySchema } from './0038-ticket-category.js'
import { reportReasonSchema } from './0039-report-reason.js'
import { savedNoticesSchema } from './0040-saved-notices.js'
import { secondFactorSchema } from './0041-second-factor.js'
import { legalSchema } from './0042-legal.js'
import { clickerReviewSchema } from './0043-clicker-review.js'
import { recordStyleSchema } from './0044-record-style.js'
import { clickerClicksSchema } from './0045-clicker-clicks.js'
import { clickerGiftsSchema } from './0046-clicker-gifts.js'
import { clickerGiftLogSchema } from './0047-clicker-gift-log.js'
import { brokenSeatsSchema } from './0048-broken-seats.js'
import { helpNewsSchema } from './0049-help-news.js'
import { clickerDonationsSchema } from './0050-clicker-donations.js'
import { examAttemptsSchema } from './0051-exam-attempts.js'
import { clickerCheatLogSchema } from './0052-clicker-cheat-log.js'
import { quizSchema } from './0053-quiz.js'
import { gameResultsSchema } from './0054-game-results.js'
import { turnGamesSchema } from './0055-turn-games.js'
import { quizMissesSchema } from './0056-quiz-misses.js'
import type { Migration } from './types.js'

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
  clickerCaughtSchema,
  clickerCapitalSchema,
  usageFlowsSchema,
  tourSpeedSchema,
  staffSchema,
  conversationsSchema,
  evaluationMissedSchema,
  settledTicketsSchema,
  curriculumVotesSchema,
  ticketCategorySchema,
  reportReasonSchema,
  savedNoticesSchema,
  secondFactorSchema,
  legalSchema,
  clickerReviewSchema,
  recordStyleSchema,
  clickerClicksSchema,
  clickerGiftsSchema,
  clickerGiftLogSchema,
  brokenSeatsSchema,
  helpNewsSchema,
  clickerDonationsSchema,
  examAttemptsSchema,
  clickerCheatLogSchema,
  quizSchema,
  gameResultsSchema,
  turnGamesSchema,
  quizMissesSchema,
]

/** Versión más alta que existe en el código. */
export const LATEST_VERSION: number = MIGRATIONS.reduce(
  (max, migration) => Math.max(max, migration.version),
  0,
)
