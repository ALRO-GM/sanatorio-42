/**
 * Not-games: las salas de preguntas, quién juega en cada una, las preguntas
 * montadas de cada partida, las respuestas y lo que falla la gente en cada
 * concepto (de ahí sale su dificultad). Módulo `quiz`.
 */

import type { Migration } from './types.js'

export const quizSchema: Migration = {
  version: 53,
  name: 'not-games',
  statements: [
    `CREATE TABLE quiz_rooms (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      campus_id   INTEGER NOT NULL,
      host        TEXT NOT NULL,
      settings    TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'lobby',
      round       INTEGER NOT NULL DEFAULT -1,
      phase       TEXT,
      phase_until INTEGER,
      created_at  TEXT NOT NULL,
      started_at  TEXT,
      finished_at TEXT
    )`,
    'CREATE INDEX idx_quiz_rooms_campus ON quiz_rooms (campus_id, status)',
    `CREATE TABLE quiz_players (
      room_id   INTEGER NOT NULL,
      login     TEXT NOT NULL,
      team      TEXT,
      score     INTEGER NOT NULL DEFAULT 0,
      correct   INTEGER NOT NULL DEFAULT 0,
      wrong     INTEGER NOT NULL DEFAULT 0,
      lives     INTEGER,
      ms        INTEGER NOT NULL DEFAULT 0,
      out       INTEGER NOT NULL DEFAULT 0,
      joined_at TEXT NOT NULL,
      PRIMARY KEY (room_id, login)
    )`,
    'CREATE INDEX idx_quiz_players_login ON quiz_players (login)',
    `CREATE TABLE quiz_rounds (
      room_id    INTEGER NOT NULL,
      idx        INTEGER NOT NULL,
      concept_id TEXT NOT NULL,
      kind       TEXT NOT NULL,
      seconds    INTEGER NOT NULL,
      level      INTEGER NOT NULL,
      prompt     TEXT NOT NULL,
      code       TEXT,
      options    TEXT NOT NULL,
      answer     INTEGER NOT NULL,
      why        TEXT NOT NULL,
      starts_at  INTEGER,
      ends_at    INTEGER,
      PRIMARY KEY (room_id, idx)
    )`,
    `CREATE TABLE quiz_answers (
      room_id INTEGER NOT NULL,
      idx     INTEGER NOT NULL,
      login   TEXT NOT NULL,
      option  INTEGER NOT NULL,
      correct INTEGER NOT NULL,
      ms      INTEGER NOT NULL,
      PRIMARY KEY (room_id, idx, login)
    )`,
    `CREATE TABLE quiz_stats (
      concept_id TEXT PRIMARY KEY,
      shown      INTEGER NOT NULL DEFAULT 0,
      wrong      INTEGER NOT NULL DEFAULT 0
    )`,
  ],
}
