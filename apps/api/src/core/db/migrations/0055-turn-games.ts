/**
 * Not-games por turnos con pregunta (ajedrez y los que vengan): la sala, quién
 * juega con qué bando y el estado entero de la partida (tablero, relojes,
 * pregunta), en JSON: lo lee y lo escribe solo el motor, de una vez.
 */

import type { Migration } from './types.js'

export const turnGamesSchema: Migration = {
  version: 55,
  name: 'turn-games',
  statements: [
    `CREATE TABLE turn_rooms (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      game        TEXT NOT NULL,
      campus_id   INTEGER NOT NULL,
      host        TEXT NOT NULL,
      settings    TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'lobby',
      state       TEXT,
      created_at  TEXT NOT NULL,
      finished_at TEXT
    )`,
    'CREATE INDEX idx_turn_rooms_campus ON turn_rooms (campus_id, status)',
    `CREATE TABLE turn_players (
      room_id   INTEGER NOT NULL,
      login     TEXT NOT NULL,
      side      TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      PRIMARY KEY (room_id, login)
    ) WITHOUT ROWID`,
    'CREATE INDEX idx_turn_players_login ON turn_players (login)',
  ],
}
