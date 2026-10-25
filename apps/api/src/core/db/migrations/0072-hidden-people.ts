/**
 * Personas ocultas (`docs/personas-ocultas.md`): quien administra puede
 * ocultar a alguien a los estudiantes, a los piscineros o a los dos. Una fila
 * por persona; el motivo solo lo lee quien administra.
 */

import type { Migration } from './types.js'

export const hiddenPeopleSchema: Migration = {
  version: 72,
  name: 'hidden-people',
  statements: [
    `CREATE TABLE hidden_people (
      login         TEXT PRIMARY KEY,
      from_students INTEGER NOT NULL DEFAULT 0,
      from_pool     INTEGER NOT NULL DEFAULT 0,
      reason        TEXT,
      hidden_by     TEXT NOT NULL,
      hidden_at     TEXT NOT NULL
    )`,
  ],
}
