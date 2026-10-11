/**
 * Pace y plazo del milestone que cada persona copia de su perfil de la intra.
 *
 * 42 no los da en su API, y sin ellos las fechas del estado de salud no salen
 * exactas (faltan los días de bonus). Se guarda también en qué círculo estaba
 * al anotarlo, porque el plazo es el de ese círculo.
 *
 * Tabla del módulo `profile`.
 */

import type { Migration } from './types.js'

export const paceRefSchema: Migration = {
  version: 24,
  name: 'pace-y-plazo-anotados',
  statements: [
    `CREATE TABLE pace_refs (
        login      TEXT PRIMARY KEY,
        pace       INTEGER NOT NULL,
        circle     INTEGER NOT NULL,
        deadline   TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) WITHOUT ROWID`,
  ],
}
