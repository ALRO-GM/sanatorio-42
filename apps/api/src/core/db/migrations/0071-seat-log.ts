/**
 * Dónde se ha sentado cada cual y cuándo (`docs/asientos.md`): una fila por
 * sesión de 42 en un puesto, con su principio y la última vez que se la vio
 * abierta. Se llena con la copia de los puestos (cada 2 min con gente, cada
 * 5 sin nadie) y de aquí sale la red de asientos. Se guarda la sesión entera,
 * no la cuenta, para poder cambiar después cómo se mide la cercanía.
 */

import type { Migration } from './types.js'

export const seatLogSchema: Migration = {
  version: 71,
  name: 'seat-log',
  statements: [
    `CREATE TABLE seat_sessions (
      location_id INTEGER PRIMARY KEY,
      campus_id   INTEGER NOT NULL,
      user_id     INTEGER NOT NULL,
      login       TEXT NOT NULL,
      host        TEXT NOT NULL,
      begin_at    TEXT NOT NULL,
      seen_at     TEXT NOT NULL
    )`,
    'CREATE INDEX seat_sessions_campus ON seat_sessions (campus_id, seen_at)',
    'CREATE INDEX seat_sessions_login ON seat_sessions (login)',
  ],
}
