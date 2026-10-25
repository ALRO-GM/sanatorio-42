/**
 * Cuándo se vio por primera vez cada sesión de la red de asientos
 * (`docs/asientos.md`). El `begin_at` de 42 puede ser de días antes: un puesto
 * de examen que no echa a nadie deja la sesión abierta y 42 sigue dando la
 * hora de entrada de entonces. Las horas cuentan desde que se la vio aquí.
 *
 * Las que ya había se vieron, como pronto, cuando empezó el historial (la
 * primera foto guardada).
 */

import type { Migration } from './types.js'

export const seatFirstSeenSchema: Migration = {
  version: 79,
  name: 'seat-first-seen',
  statements: [
    'ALTER TABLE seat_sessions ADD COLUMN first_seen_at TEXT',
    `UPDATE seat_sessions SET first_seen_at = MAX(
       begin_at,
       (SELECT MIN(seen_at) FROM seat_sessions)
     )`,
  ],
}
