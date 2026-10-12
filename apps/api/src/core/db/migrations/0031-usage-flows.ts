/**
 * Por dónde se mueve la gente dentro de la web, y desde cuándo está conectada.
 *
 * - `usage_flows`: cuántas veces se ha pasado de una sección a otra, por
 *   persona y día (UTC). `from_key` vale `start` cuando es la primera sección
 *   que se abre al entrar. Las salidas no se apuntan: son las llegadas a una
 *   sección que no continúan a otra.
 * - `profiles.session_at`: cuándo empezó la sesión en curso. `seen_at` dice si
 *   alguien está conectado; esto, cuánto lleva.
 *
 * Tabla del módulo `usage`; la columna, del módulo `profile`.
 */

import type { Migration } from './types.js'

export const usageFlowsSchema: Migration = {
  version: 31,
  name: 'recorridos-de-uso',
  statements: [
    `CREATE TABLE usage_flows (
        login    TEXT NOT NULL,
        day      TEXT NOT NULL,
        from_key TEXT NOT NULL,
        to_key   TEXT NOT NULL,
        count    INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (login, day, from_key, to_key)
      ) WITHOUT ROWID`,
    'CREATE INDEX idx_usage_flows_day ON usage_flows (day)',
    'ALTER TABLE profiles ADD COLUMN session_at TEXT',
  ],
}
