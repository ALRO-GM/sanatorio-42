/**
 * Curso de NetPractice (módulo `netcourse`, `docs/curso-netpractice.md`): como
 * los de shell, Docker y Kubernetes (migraciones 74, 87 y 88), los puntos
 * superados con su mejor vez y la hora a la que empezó cada contrarreloj, que
 * apunta la API. Aquí `commands` son las comprobaciones que hicieron falta
 * hasta acertar. El tiempo activo va a `course_times` (migración 75) con
 * `course = 'net'`.
 */

import type { Migration } from './types.js'

export const netCourseSchema: Migration = {
  version: 92,
  name: 'net-course',
  statements: [
    `CREATE TABLE net_progress (
      login    TEXT NOT NULL,
      unit     TEXT NOT NULL,
      stars    INTEGER NOT NULL,
      commands INTEGER NOT NULL,
      seconds  INTEGER,
      done_at  TEXT NOT NULL,
      PRIMARY KEY (login, unit)
    ) WITHOUT ROWID`,
    `CREATE TABLE net_runs (
      login      TEXT NOT NULL,
      unit       TEXT NOT NULL,
      started_at TEXT NOT NULL,
      PRIMARY KEY (login, unit)
    ) WITHOUT ROWID`,
  ],
}
