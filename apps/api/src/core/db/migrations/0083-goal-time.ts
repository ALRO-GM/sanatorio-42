/**
 * La hora de entrega de una meta de la agenda (`HH:MM`, hora del campus), pedida
 * por Alberto el 2026-11-01: hasta ahora solo había día. Sin hora (`NULL`), la
 * meta vence al acabar ese día, como antes.
 */

import type { Migration } from './types.js'

export const goalTimeSchema: Migration = {
  version: 83,
  name: 'goal-time',
  statements: [`ALTER TABLE scrum_goals ADD COLUMN target_time TEXT`],
}
