/**
 * Pomodoro (#65 del buzón): quién está concentrado y hasta cuándo, con lo que
 * ha elegido ver mientras. Los demás ven «concentrado, no me distraigas».
 */

import type { Migration } from './types.js'

export const focusSchema: Migration = {
  version: 59,
  name: 'focus',
  statements: [
    `CREATE TABLE focus (
      login      TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      until      TEXT NOT NULL,
      settings   TEXT NOT NULL
    ) WITHOUT ROWID`,
  ],
}
