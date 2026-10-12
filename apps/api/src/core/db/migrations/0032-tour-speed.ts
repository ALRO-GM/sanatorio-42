/**
 * La velocidad de las demostraciones animadas.
 *
 * - `tour_speeds`: a cuánto va cada una de fábrica (`1` es el ritmo con el que
 *   se escribió). Se ajusta sola con lo que hace la gente.
 * - `tour_rates`: a cuánto la ha puesto cada persona la última vez que la vio,
 *   respecto a la de fábrica (`1.5` es «la aceleré la mitad más»). Una fila por
 *   persona y demostración; al ajustar la velocidad se borran y se empieza a
 *   contar otra vez.
 *
 * Tablas del módulo `tours`.
 */

import type { Migration } from './types.js'

export const tourSpeedSchema: Migration = {
  version: 32,
  name: 'velocidad-de-las-demostraciones',
  statements: [
    `CREATE TABLE tour_speeds (
        name       TEXT PRIMARY KEY,
        speed      REAL NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL
      ) WITHOUT ROWID`,
    `CREATE TABLE tour_rates (
        name  TEXT NOT NULL,
        login TEXT NOT NULL,
        rate  REAL NOT NULL,
        at    TEXT NOT NULL,
        PRIMARY KEY (name, login)
      ) WITHOUT ROWID`,
  ],
}
