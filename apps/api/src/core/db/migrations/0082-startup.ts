/**
 * La startup del Pomodoro (`docs/pomodoro-startup.md`): la partida de cada
 * persona, en JSON (`@sanatorio/startup`, `StartupState`). Lo ganado no se
 * guarda: sale de sus sesiones de concentración (`focus_sessions`).
 */

import type { Migration } from './types.js'

export const startupSchema: Migration = {
  version: 82,
  name: 'startup',
  statements: [
    `CREATE TABLE startup (
      login      TEXT PRIMARY KEY,
      state      TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) WITHOUT ROWID`,
  ],
}
