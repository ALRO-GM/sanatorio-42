/**
 * Uso de la web por persona, hora y elemento: cuántas veces se pulsa y cuánto
 * tiempo se pasa en cada sección, separando si la ventana se estaba viendo, si
 * estaba abierta pero detrás de otra, o si estaba oculta.
 *
 * `usage_counts` (la 0014) sigue siendo la que ordena las pestañas; esta es
 * para las estadísticas de quien administra, y se borra pasado medio año.
 *
 * El día y la hora van en UTC, como en `request_stats`.
 *
 * Tabla del módulo `usage`.
 */

import type { Migration } from './types.js'

export const usageTimeSchema: Migration = {
  version: 25,
  name: 'tiempo-de-uso',
  statements: [
    `CREATE TABLE usage_time (
        login    TEXT NOT NULL,
        day      TEXT NOT NULL,
        hour     INTEGER NOT NULL,
        key      TEXT NOT NULL,
        clicks   INTEGER NOT NULL DEFAULT 0,
        seen_s   INTEGER NOT NULL DEFAULT 0,
        back_s   INTEGER NOT NULL DEFAULT 0,
        hidden_s INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (login, day, hour, key)
      ) WITHOUT ROWID`,
    `CREATE INDEX idx_usage_time_when ON usage_time (day, hour)`,
  ],
}
