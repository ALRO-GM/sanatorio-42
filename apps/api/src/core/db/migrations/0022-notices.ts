/**
 * El buzón de avisos de cada persona.
 *
 * Mientras un aviso sigue sin leer, lo mismo que vuelve a pasar (otro mensaje
 * en el mismo chat) no crea otra fila: sube `count`.
 *
 * Tabla del módulo `notices`.
 */

import type { Migration } from './types.js'

export const noticesSchema: Migration = {
  version: 22,
  name: 'buzon-de-avisos',
  statements: [
    `CREATE TABLE notices (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        login      TEXT NOT NULL,
        kind       TEXT NOT NULL,
        ref        TEXT NOT NULL,
        from_login TEXT,
        text       TEXT,
        count      INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        read_at    TEXT
      )`,
    `CREATE INDEX idx_notices_login ON notices (login, read_at, updated_at)`,
  ],
}
