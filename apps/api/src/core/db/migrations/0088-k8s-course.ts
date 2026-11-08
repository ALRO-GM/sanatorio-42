/**
 * Curso de Kubernetes (módulo `k8scourse`, `docs/curso-kubernetes.md`): como
 * los de shell y Docker (migraciones 74 y 87), los puntos superados con su
 * mejor vez y la hora a la que empezó cada contrarreloj, que apunta la API. El
 * tiempo activo va a `course_times` (migración 75) con `course = 'k8s'`.
 */

import type { Migration } from './types.js'

export const k8sCourseSchema: Migration = {
  version: 88,
  name: 'k8s-course',
  statements: [
    `CREATE TABLE k8s_progress (
      login    TEXT NOT NULL,
      unit     TEXT NOT NULL,
      stars    INTEGER NOT NULL,
      commands INTEGER NOT NULL,
      seconds  INTEGER,
      done_at  TEXT NOT NULL,
      PRIMARY KEY (login, unit)
    ) WITHOUT ROWID`,
    `CREATE TABLE k8s_runs (
      login      TEXT NOT NULL,
      unit       TEXT NOT NULL,
      started_at TEXT NOT NULL,
      PRIMARY KEY (login, unit)
    ) WITHOUT ROWID`,
  ],
}
