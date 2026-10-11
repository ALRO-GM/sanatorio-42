/**
 * Avisos de evento que se le pasaron a alguien: no dijo si iba, pasó media hora
 * desde el inicio y se le dio por no asistido. Se guardan para enseñárselo una
 * vez, hasta que lo cierre.
 *
 * `event` es el evento tal como estaba (JSON): para entonces puede haber salido
 * ya de su calendario.
 *
 * Tabla del módulo `meet`.
 */

import type { Migration } from './types.js'

export const eventAlertsSchema: Migration = {
  version: 23,
  name: 'avisos-que-se-pasaron',
  statements: [
    `CREATE TABLE event_alerts (
        event_id  TEXT NOT NULL,
        login     TEXT NOT NULL,
        event     TEXT NOT NULL,
        starts_at TEXT NOT NULL,
        missed_at TEXT NOT NULL,
        acked_at  TEXT,
        PRIMARY KEY (event_id, login)
      ) WITHOUT ROWID`,
    `CREATE INDEX idx_event_alerts_login ON event_alerts (login, acked_at)`,
  ],
}
