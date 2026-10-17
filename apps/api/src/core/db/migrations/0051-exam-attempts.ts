/**
 * Exámenes: cada intento de cada persona, con su nota.
 *
 * 42 da los intentos de un examen como «equipos» de la fila de ese proyecto
 * (`teams`), cada uno con su nota y cuándo se hizo; `occurrence` son los
 * reintentos. Se guardan al copiar las filas de los exámenes, y un trabajo de
 * fondo completa los de antes. Tablas de la réplica (módulo `exams`).
 */

import type { Migration } from './types.js'

export const examAttemptsSchema: Migration = {
  version: 51,
  name: 'intentos-de-examen',
  statements: [
    `CREATE TABLE exam_attempts (
      team_id         INTEGER PRIMARY KEY,
      project_user_id INTEGER NOT NULL,
      user_id         INTEGER NOT NULL,
      project_id      INTEGER NOT NULL,
      mark            INTEGER,
      validated       INTEGER,
      at              TEXT
    )`,
    'CREATE INDEX idx_exam_attempts_project ON exam_attempts (project_id, user_id)',
    'ALTER TABLE project_users ADD COLUMN occurrence INTEGER',
  ],
}
