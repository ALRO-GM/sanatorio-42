/**
 * Code Clicker: el registro de trampas, una fila por cada vez que se pilla a
 * alguien. Antes solo quedaba la última trampa de cada persona (`caught_why`)
 * y unas pocas partidas rechazadas; para el apartado de trampas del panel hace
 * falta la historia entera: cuándo, cómo se vio (sola, al revisar un salto o
 * sancionando a mano), por qué, qué se le requisó y si se indultó.
 *
 * Se rellena con lo que ya había: las partidas rechazadas guardadas y la
 * última revisión de cada cual. Módulo `clicker`.
 */

import type { Migration } from './types.js'

export const clickerCheatLogSchema: Migration = {
  version: 52,
  name: 'registro-de-trampas',
  statements: [
    `CREATE TABLE clicker_cheat_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      login       TEXT NOT NULL,
      at          TEXT NOT NULL,
      how         TEXT NOT NULL,
      why         TEXT NOT NULL,
      total       REAL,
      per_second  REAL,
      seized      REAL NOT NULL DEFAULT 0,
      detail      TEXT,
      copy_id     INTEGER,
      pardoned_at TEXT
    )`,
    'CREATE INDEX idx_clicker_cheat_log_login ON clicker_cheat_log (login, at)',
    `INSERT INTO clicker_cheat_log (login, at, how, why, total, per_second, copy_id)
       SELECT login, at, 'auto', why, total, per_second, id FROM clicker_cheats`,
    `INSERT INTO clicker_cheat_log (login, at, how, why)
       SELECT login, caught_at, 'review', 'review' FROM clicker
       WHERE caught_why = 'review' AND caught_at IS NOT NULL`,
  ],
}
