/**
 * Lo que falta para el "estado de salud": cuándo validó cada persona cada rango
 * del common core y la fecha de black hole que da 42.
 *
 * Tablas del módulo `replica`.
 */

import type { Migration } from './types.js'

export const healthSchema: Migration = {
  version: 11,
  name: 'estado-de-salud',
  statements: [
    // Fechas ISO en JSON: `ranks[2]` es cuándo validó el rango 2.
    `ALTER TABLE user_tracks ADD COLUMN ranks TEXT NOT NULL DEFAULT '[]'`,
    `ALTER TABLE user_levels ADD COLUMN blackholed_at TEXT`,
  ],
}
