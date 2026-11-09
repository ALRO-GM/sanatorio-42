/**
 * El uso de cada puesto ya sumado (`docs/asientos.md`, módulo `network`): el
 * mapa de calor de Clústeres dejaba de leer millones de sesiones cada vez.
 *
 * - `seat_usage`: cuánto tiempo usó cada persona cada puesto cada día (UTC),
 *   medido como la red de asientos. Se suma por tandas de fondo, cada hora.
 * - `seat_sessions.counted_seen_at`: el `seen_at` de la sesión que ya está
 *   sumado. Una sesión abierta se alarga (`seen_at` crece) y vuelve a quedar
 *   pendiente sola: el índice parcial son exactamente las que faltan por sumar.
 * - `seat_usage_state`: hasta cuándo está sumado todo. Sin fila, la suma de
 *   todo el historial no ha acabado aún y el mapa se calcula como antes.
 */

import type { Migration } from './types.js'

export const seatUsageSchema: Migration = {
  version: 91,
  name: 'seat-usage',
  statements: [
    'ALTER TABLE seat_sessions ADD COLUMN counted_seen_at TEXT',
    `CREATE INDEX seat_sessions_uncounted ON seat_sessions (location_id)
       WHERE counted_seen_at IS NOT seen_at`,
    `CREATE TABLE seat_usage (
      campus_id INTEGER NOT NULL,
      day       TEXT NOT NULL,
      host      TEXT NOT NULL,
      login     TEXT NOT NULL,
      cluster   TEXT NOT NULL,
      ms        INTEGER NOT NULL,
      PRIMARY KEY (campus_id, day, host, login)
    ) WITHOUT ROWID`,
    'CREATE INDEX seat_usage_login ON seat_usage (login)',
    `CREATE TABLE seat_usage_state (
      id      INTEGER PRIMARY KEY CHECK (id = 1),
      through TEXT NOT NULL
    )`,
  ],
}
