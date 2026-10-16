/**
 * Quién ha aceptado qué versión de la privacidad y las condiciones. Una fila
 * por persona y versión: al cambiar el texto, se vuelve a pedir.
 *
 * Tabla del módulo `legal`.
 */

import type { Migration } from './types.js'

export const legalSchema: Migration = {
  version: 42,
  name: 'aceptacion-de-condiciones',
  statements: [
    `CREATE TABLE legal_acceptances (
        login       TEXT NOT NULL,
        version     TEXT NOT NULL,
        accepted_at TEXT NOT NULL,
        PRIMARY KEY (login, version)
      ) WITHOUT ROWID`,
  ],
}
