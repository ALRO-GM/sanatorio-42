/**
 * Curso de git fuera del clúster (pedido por Alberto el 2026-11-08): desde el
 * panel se da permiso a algunas personas para hacerlo sin estar sentadas en un
 * puesto, y que les cuente. A cambio, al jugar dicen dónde están.
 */

import type { Migration } from './types.js'

export const courseRemoteSchema: Migration = {
  version: 86,
  name: 'course-remote',
  statements: [
    // A quién se le dio permiso y quién se lo dio.
    `CREATE TABLE course_remote (
      login      TEXT PRIMARY KEY,
      granted_by TEXT NOT NULL,
      granted_at TEXT NOT NULL
    ) WITHOUT ROWID`,
    // El último sitio que dijo (`campus`, `remote`, `outside`); vale unas horas.
    `CREATE TABLE course_places (
      login       TEXT PRIMARY KEY,
      place       TEXT NOT NULL,
      declared_at TEXT NOT NULL
    ) WITHOUT ROWID`,
    // Dónde se superó cada punto: `NULL` es desde un puesto del clúster.
    'ALTER TABLE git_progress ADD COLUMN place TEXT',
  ],
}
