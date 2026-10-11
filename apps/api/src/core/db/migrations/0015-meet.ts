/**
 * Avisos y chat de cada evento, y la asistencia validada con códigos.
 *
 * `event_id` es el id del evento en el calendario (`board:12`,
 * `help:booking:7`…), no una clave a otra tabla: el chat vale igual para una
 * pizarra que para una corrección de 42.
 *
 * Tablas del módulo `meet`.
 */

import type { Migration } from './types.js'

export const meetSchema: Migration = {
  version: 15,
  name: 'avisos-y-asistencia',
  statements: [
    `CREATE TABLE event_messages (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id   TEXT NOT NULL,
        login      TEXT NOT NULL,
        kind       TEXT NOT NULL CHECK (kind IN ('seen', 'late', 'absent', 'text')),
        minutes    INTEGER,
        reason     TEXT,
        body       TEXT,
        created_at TEXT NOT NULL
      )`,
    `CREATE INDEX idx_event_messages_event ON event_messages (event_id, id)`,

    // Dos códigos por evento: uno para validar que empieza y otro para validar
    // que termina. Los ve quien organiza y los escribe quien asiste.
    `CREATE TABLE event_codes (
        event_id   TEXT PRIMARY KEY,
        start_code TEXT NOT NULL,
        end_code   TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) WITHOUT ROWID`,

    // Cuándo validó cada persona cada código. Sin los dos, la asistencia no vale.
    `CREATE TABLE event_attendance (
        event_id   TEXT NOT NULL,
        login      TEXT NOT NULL,
        started_at TEXT,
        ended_at   TEXT,
        PRIMARY KEY (event_id, login)
      ) WITHOUT ROWID`,
  ],
}
