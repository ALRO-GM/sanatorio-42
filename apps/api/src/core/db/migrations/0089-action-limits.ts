/**
 * Topes por persona regulables desde el panel (`core/limits.ts`,
 * `docs/limites.md`): lo puesto para todo el mundo (`login = ''`) y lo puesto a
 * una persona. Lo que no está aquí vale lo de fábrica.
 */

import type { Migration } from './types.js'

export const actionLimitsSchema: Migration = {
  version: 89,
  name: 'action-limits',
  statements: [
    `CREATE TABLE action_limits (
      login  TEXT NOT NULL,
      key    TEXT NOT NULL,
      value  INTEGER NOT NULL,
      set_by TEXT NOT NULL,
      set_at TEXT NOT NULL,
      PRIMARY KEY (login, key)
    ) WITHOUT ROWID`,
  ],
}
