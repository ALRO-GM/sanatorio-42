/**
 * Mapa de clusters.
 *
 * - `seats`: puestos que se han visto ocupados alguna vez. La API de 42 no
 *   publica el plano de un campus; se va aprendiendo de quién se sienta dónde.
 *   Tabla del módulo `replica`.
 * - `therapy_groups.seats`: puestos que reserva un grupo de terapia, separados
 *   por comas. Tabla del módulo `therapy`.
 */

import type { Migration } from './types.js'

export const mapSchema: Migration = {
  version: 4,
  name: 'mapa',
  statements: [
    `CREATE TABLE seats (
        campus_id INTEGER NOT NULL,
        host      TEXT NOT NULL,
        seen_at   TEXT NOT NULL,
        PRIMARY KEY (campus_id, host)
      ) WITHOUT ROWID`,
    `ALTER TABLE therapy_groups ADD COLUMN seats TEXT NOT NULL DEFAULT ''`,
  ],
}
