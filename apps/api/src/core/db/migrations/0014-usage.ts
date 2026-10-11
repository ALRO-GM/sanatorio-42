/**
 * Uso de cada elemento de la web (secciones y bloques de cada página), por
 * persona. De aquí sale la ordenación automática "según la comunidad".
 *
 * Solo contadores: no se guarda cuándo ni desde dónde.
 *
 * Tabla del módulo `usage`.
 */

import type { Migration } from './types.js'

export const usageSchema: Migration = {
  version: 14,
  name: 'uso',
  statements: [
    `CREATE TABLE usage_counts (
        key   TEXT NOT NULL,
        login TEXT NOT NULL,
        count INTEGER NOT NULL,
        PRIMARY KEY (key, login)
      ) WITHOUT ROWID`,
  ],
}
