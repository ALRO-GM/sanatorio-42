/**
 * Not-games: lo que ha fallado cada persona, por concepto, para su Repaso. Las
 * salas se borran; esto queda. `last_right_at` dice si lo acertó después.
 */

import type { Migration } from './types.js'

export const quizMissesSchema: Migration = {
  version: 56,
  name: 'quiz-misses',
  statements: [
    `CREATE TABLE quiz_misses (
      login          TEXT NOT NULL,
      concept_id     TEXT NOT NULL,
      misses         INTEGER NOT NULL DEFAULT 0,
      last_missed_at TEXT,
      last_right_at  TEXT,
      PRIMARY KEY (login, concept_id)
    ) WITHOUT ROWID`,
  ],
}
