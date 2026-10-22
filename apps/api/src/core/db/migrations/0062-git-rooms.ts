/**
 * Curso de git: las salas de las pruebas de grupo. El estado de la partida (el
 * origin común y el repositorio de cada cual) va entero en JSON: solo lo toca
 * el motor, siempre de una vez.
 */

import type { Migration } from './types.js'

export const gitRoomsSchema: Migration = {
  version: 62,
  name: 'git-rooms',
  statements: [
    `CREATE TABLE git_rooms (
      id          INTEGER PRIMARY KEY,
      gate        TEXT NOT NULL,
      campus_id   INTEGER NOT NULL,
      host        TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'lobby',
      state       TEXT,
      created_at  TEXT NOT NULL,
      finished_at TEXT
    )`,
    `CREATE TABLE git_room_players (
      room_id   INTEGER NOT NULL,
      login     TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      PRIMARY KEY (room_id, login)
    ) WITHOUT ROWID`,
    'CREATE INDEX git_room_players_login ON git_room_players (login)',
    'CREATE INDEX git_rooms_lobby ON git_rooms (campus_id, status)',
  ],
}
