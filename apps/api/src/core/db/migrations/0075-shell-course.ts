/**
 * Curso de shell (módulo `shellcourse`): los puntos superados por cada cual,
 * con su mejor vez (estrellas, comandos y, en los jefes, segundos), y la hora
 * a la que empezó cada contrarreloj. La hora la apunta la API al empezar y la
 * usa al corregir: el navegador no dice cuánto tardó.
 */

import type { Migration } from './types.js'

export const shellCourseSchema: Migration = {
  version: 75,
  name: 'shell-course',
  statements: [
    `CREATE TABLE shell_progress (
      login    TEXT NOT NULL,
      unit     TEXT NOT NULL,
      stars    INTEGER NOT NULL,
      commands INTEGER NOT NULL,
      seconds  INTEGER,
      done_at  TEXT NOT NULL,
      PRIMARY KEY (login, unit)
    ) WITHOUT ROWID`,
    `CREATE TABLE shell_runs (
      login      TEXT NOT NULL,
      unit       TEXT NOT NULL,
      started_at TEXT NOT NULL,
      PRIMARY KEY (login, unit)
    ) WITHOUT ROWID`,
  ],
}
