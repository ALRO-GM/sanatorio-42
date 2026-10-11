/**
 * Horas estimadas de cada proyecto y nivel de cada persona en el 42cursus.
 *
 * - `projects.hours`: lo que 42 estima que lleva el proyecto. Da el tamaño de su
 *   burbuja en el grafo del tablón.
 * - `user_levels`: el nivel (`3.66`) que trae el perfil al entrar. Va en su
 *   tabla y no en `users` porque esa fila se reescribe entera cada vez que 42
 *   manda a la persona, y el nivel solo llega con el login.
 *
 * Tablas del módulo `replica`.
 */

import type { Migration } from './types.js'

export const hoursAndLevelSchema: Migration = {
  version: 9,
  name: 'horas-y-nivel',
  statements: [
    `ALTER TABLE projects ADD COLUMN hours REAL`,
    `CREATE TABLE user_levels (
        login      TEXT PRIMARY KEY,
        level      REAL NOT NULL,
        updated_at TEXT NOT NULL
      ) WITHOUT ROWID`,
  ],
}
