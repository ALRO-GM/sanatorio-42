/**
 * Avisos con cuenta atrás (`docs/avisos-cuenta-atras.md`).
 *
 * - `countdown_notices`: los que manda quien administra (la limpieza de
 *   taquillas), a un grupo y, si se quiere, a un campus.
 * - `countdown_dismissals`: quién ha cerrado cuál, para que no le vuelva a
 *   salir en ningún navegador.
 * - `countdown_pins`: lo que se fija cada cual (un evento del calendario, su
 *   próximo compromiso o algo suyo).
 *
 * El modo mantenimiento no necesita tabla: vive en `settings`.
 */

import type { Migration } from './types.js'

export const countdownsSchema: Migration = {
  version: 73,
  name: 'countdowns',
  statements: [
    `CREATE TABLE countdown_notices (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT,
      body        TEXT,
      preset      TEXT,
      target_at   TEXT NOT NULL,
      target_group TEXT NOT NULL DEFAULT 'all',
      campus_id   INTEGER,
      created_by  TEXT NOT NULL,
      created_at  TEXT NOT NULL
    )`,
    `CREATE TABLE countdown_dismissals (
      notice_id    INTEGER NOT NULL,
      login        TEXT NOT NULL,
      dismissed_at TEXT NOT NULL,
      PRIMARY KEY (notice_id, login)
    )`,
    `CREATE TABLE countdown_pins (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      login      TEXT NOT NULL,
      kind       TEXT NOT NULL,
      title      TEXT,
      target_at  TEXT,
      event_id   TEXT,
      created_at TEXT NOT NULL
    )`,
    'CREATE INDEX countdown_pins_login ON countdown_pins (login)',
  ],
}
