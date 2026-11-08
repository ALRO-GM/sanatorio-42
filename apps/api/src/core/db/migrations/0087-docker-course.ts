/**
 * Curso de Docker (módulo `dockercourse`, `docs/curso-docker.md`): como el de
 * shell (migración 74), los puntos superados con su mejor vez y la hora a la
 * que empezó cada contrarreloj, que apunta la API. El tiempo activo va a
 * `course_times` (migración 75) con `course = 'docker'`.
 */

import type { Migration } from './types.js'

export const dockerCourseSchema: Migration = {
  version: 87,
  name: 'docker-course',
  statements: [
    `CREATE TABLE docker_progress (
      login    TEXT NOT NULL,
      unit     TEXT NOT NULL,
      stars    INTEGER NOT NULL,
      commands INTEGER NOT NULL,
      seconds  INTEGER,
      done_at  TEXT NOT NULL,
      PRIMARY KEY (login, unit)
    ) WITHOUT ROWID`,
    `CREATE TABLE docker_runs (
      login      TEXT NOT NULL,
      unit       TEXT NOT NULL,
      started_at TEXT NOT NULL,
      PRIMARY KEY (login, unit)
    ) WITHOUT ROWID`,
  ],
}
