/**
 * Code Clicker: revisar a mano los saltos de capital sospechosos y la bolsa
 * común de lo requisado.
 *
 * - `clicker_alerts.status`: `open` (por mirar), `asked` (se le han enseñado los
 *   datos y tiene que defenderse) o `answered` (ya ha contestado: `answer`).
 *   `evidence` guarda los datos que se le enseñaron, en JSON.
 * - `clicker.seizure`: lo que se le ha requisado y por qué (JSON), hasta que lo
 *   vea en el juego; `pool_bonus`, lo que ha cobrado de la bolsa desde su último
 *   guardado (para que no cuente como trampa); `pool_claimed_at`, cuándo.
 * - `clicker_pool`: una sola fila con lo que hay en la bolsa.
 *
 * Tablas del módulo `clicker`.
 */

import type { Migration } from './types.js'

export const clickerReviewSchema: Migration = {
  version: 43,
  name: 'revision-de-trampas-y-bolsa-comun',
  statements: [
    `ALTER TABLE clicker_alerts ADD COLUMN status TEXT NOT NULL DEFAULT 'open'
       CHECK (status IN ('open', 'asked', 'answered'))`,
    `ALTER TABLE clicker_alerts ADD COLUMN evidence TEXT`,
    `ALTER TABLE clicker_alerts ADD COLUMN answer TEXT`,
    `ALTER TABLE clicker_alerts ADD COLUMN answered_at TEXT`,
    `ALTER TABLE clicker ADD COLUMN seizure TEXT`,
    `ALTER TABLE clicker ADD COLUMN pool_bonus REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE clicker ADD COLUMN pool_claimed_at TEXT`,
    `CREATE TABLE clicker_pool (
        id         INTEGER PRIMARY KEY CHECK (id = 1),
        amount     REAL NOT NULL DEFAULT 0 CHECK (amount >= 0),
        updated_at TEXT NOT NULL
      )`,
    `INSERT INTO clicker_pool (id, amount, updated_at) VALUES (1, 0, '1970-01-01T00:00:00.000Z')`,
  ],
}
