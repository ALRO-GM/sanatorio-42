/**
 * Plan de estudios: qué proyectos son del 42cursus, en qué círculo va cada uno
 * y qué plan sigue cada persona.
 *
 * - `projects.core`: `1` si el proyecto es del 42cursus, `0` si es de otro
 *   cursus (la piscina), `NULL` si aún no se sabe.
 * - `project_users.created_at_42`: cuándo se apuntó la persona al proyecto.
 * - `curriculum`: el círculo de cada proyecto en cada plan. La API de 42 no lo
 *   dice, así que se aprende de la gente (ver `replica/curriculum.ts`).
 * - `user_tracks`: el plan de cada persona y el último círculo que completó.
 *
 * Tablas del módulo `replica`.
 */

import type { Migration } from './types.js'

export const curriculumSchema: Migration = {
  version: 7,
  name: 'plan-de-estudios',
  statements: [
    `ALTER TABLE projects ADD COLUMN core INTEGER CHECK (core IN (0, 1))`,
    `ALTER TABLE project_users ADD COLUMN created_at_42 TEXT`,
    `CREATE TABLE curriculum (
        track      TEXT NOT NULL CHECK (track IN ('classic', 'next')),
        project_id INTEGER NOT NULL,
        circle     INTEGER NOT NULL,
        PRIMARY KEY (track, project_id)
      ) WITHOUT ROWID`,
    `CREATE TABLE user_tracks (
        login      TEXT PRIMARY KEY,
        track      TEXT NOT NULL CHECK (track IN ('classic', 'next')),
        rank       INTEGER NOT NULL,
        fetched_at TEXT NOT NULL
      ) WITHOUT ROWID`,
  ],
}
