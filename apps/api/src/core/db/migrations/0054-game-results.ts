/**
 * Not-games: el resultado de cada persona en cada partida terminada, de
 * cualquier juego (preguntas, ajedrez…). Las salas se borran al vaciarse y a
 * la semana; esto queda para las estadísticas y las clasificaciones.
 */

import type { Migration } from './types.js'

export const gameResultsSchema: Migration = {
  version: 54,
  name: 'game-results',
  statements: [
    `CREATE TABLE game_results (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      game      TEXT NOT NULL,
      mode      TEXT NOT NULL,
      room_id   INTEGER NOT NULL,
      campus_id INTEGER NOT NULL,
      login     TEXT NOT NULL,
      won       INTEGER NOT NULL,
      correct   INTEGER NOT NULL,
      wrong     INTEGER NOT NULL,
      score     INTEGER NOT NULL,
      at        TEXT NOT NULL
    )`,
    'CREATE INDEX idx_game_results_campus ON game_results (campus_id, game, at)',
    'CREATE INDEX idx_game_results_login ON game_results (login, game)',
  ],
}
