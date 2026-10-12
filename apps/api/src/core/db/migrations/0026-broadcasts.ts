/**
 * Comunicados de quien administra: el mensaje, a quién va y qué ha contestado
 * cada persona.
 *
 * `options` y `audience` van en JSON. Una fila en `broadcast_answers` significa
 * que esa persona ya lo ha visto: `option` es lo que eligió, o `NULL` si lo
 * cerró sin elegir (o no había nada que elegir).
 *
 * Tablas del módulo `broadcasts`.
 */

import type { Migration } from './types.js'

export const broadcastsSchema: Migration = {
  version: 26,
  name: 'comunicados',
  statements: [
    `CREATE TABLE broadcasts (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        from_login TEXT NOT NULL,
        title      TEXT NOT NULL,
        body       TEXT NOT NULL,
        options    TEXT NOT NULL DEFAULT '[]',
        required   INTEGER NOT NULL DEFAULT 0,
        audience   TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
    `CREATE TABLE broadcast_answers (
        broadcast_id INTEGER NOT NULL,
        login        TEXT NOT NULL,
        option       INTEGER,
        answered_at  TEXT NOT NULL,
        PRIMARY KEY (broadcast_id, login)
      ) WITHOUT ROWID`,
  ],
}
