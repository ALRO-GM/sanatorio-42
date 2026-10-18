/**
 * Curso de git: el test previo a cada prueba de grupo. Mientras se contesta
 * guarda las preguntas (con la buena) y el plazo; luego, si se pasó o cuándo
 * se falló (no se puede repetir hasta una hora después).
 */

import type { Migration } from './types.js'

export const gitGatesSchema: Migration = {
  version: 61,
  name: 'git-gates',
  statements: [
    `CREATE TABLE git_gates (
      login     TEXT NOT NULL,
      gate      TEXT NOT NULL,
      rounds    TEXT,
      deadline  TEXT,
      passed_at TEXT,
      failed_at TEXT,
      PRIMARY KEY (login, gate)
    ) WITHOUT ROWID`,
  ],
}
