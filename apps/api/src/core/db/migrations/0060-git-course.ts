/**
 * Curso de git (#42 del buzón): los puntos del camino que ha superado cada
 * cual, con sus mejores estrellas.
 */

import type { Migration } from './types.js'

export const gitCourseSchema: Migration = {
  version: 60,
  name: 'git-course',
  statements: [
    `CREATE TABLE git_progress (
      login    TEXT NOT NULL,
      level    TEXT NOT NULL,
      stars    INTEGER NOT NULL,
      commands INTEGER NOT NULL,
      done_at  TEXT NOT NULL,
      PRIMARY KEY (login, level)
    ) WITHOUT ROWID`,
  ],
}
