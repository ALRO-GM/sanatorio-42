/**
 * Code Clicker: los puntos de evaluación que cada cual ha donado a la bolsa de
 * 42. Dan logros y algo más de producción.
 *
 * `donated` es el total que se leyó de 42 y `donated_at`, cuándo: se pregunta
 * como mucho una vez al día por persona. Tabla del módulo `clicker`.
 */

import type { Migration } from './types.js'

export const clickerDonationsSchema: Migration = {
  version: 50,
  name: 'donaciones-a-la-bolsa',
  statements: [
    'ALTER TABLE clicker ADD COLUMN donated INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE clicker ADD COLUMN donated_at TEXT',
  ],
}
