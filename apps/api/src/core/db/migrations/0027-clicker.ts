/**
 * Code Clicker, la sección secreta: cuántas veces ha pulsado cada quien la
 * cruz, qué pastilla eligió y, si fue la roja, su partida y sus cifras para la
 * clasificación.
 *
 * `save` es la partida tal como la guarda la web (JSON): la API no la entiende,
 * solo la devuelve.
 *
 * Tabla del módulo `clicker`.
 */

import type { Migration } from './types.js'

export const clickerSchema: Migration = {
  version: 27,
  name: 'code-clicker',
  statements: [
    `CREATE TABLE clicker (
        login        TEXT PRIMARY KEY,
        plus         INTEGER NOT NULL DEFAULT 0,
        pill         TEXT CHECK (pill IN ('red', 'blue')),
        save         TEXT,
        total        REAL NOT NULL DEFAULT 0,
        per_second   REAL NOT NULL DEFAULT 0,
        achievements INTEGER NOT NULL DEFAULT 0,
        prestige     INTEGER NOT NULL DEFAULT 0,
        updated_at   TEXT NOT NULL
      ) WITHOUT ROWID`,
  ],
}
