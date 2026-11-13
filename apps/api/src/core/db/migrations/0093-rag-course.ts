/**
 * Curso de RAG (módulo `ragcourse`, `docs/curso-rag.md`): como los de shell,
 * Docker y Kubernetes (migraciones 74, 87 y 88), los puntos superados con su
 * mejor vez y la hora a la que empezó cada contrarreloj, que apunta la API. En
 * `commands` van las comprobaciones del banco de pruebas que contaron. El
 * tiempo activo va a `course_times` (migración 75) con `course = 'rag'`.
 */

import type { Migration } from './types.js'

export const ragCourseSchema: Migration = {
  version: 93,
  name: 'rag-course',
  statements: [
    `CREATE TABLE rag_progress (
      login    TEXT NOT NULL,
      unit     TEXT NOT NULL,
      stars    INTEGER NOT NULL,
      commands INTEGER NOT NULL,
      seconds  INTEGER,
      done_at  TEXT NOT NULL,
      PRIMARY KEY (login, unit)
    ) WITHOUT ROWID`,
    `CREATE TABLE rag_runs (
      login      TEXT NOT NULL,
      unit       TEXT NOT NULL,
      started_at TEXT NOT NULL,
      PRIMARY KEY (login, unit)
    ) WITHOUT ROWID`,
  ],
}
