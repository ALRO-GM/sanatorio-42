/**
 * La agenda (`docs/agenda.md`): un Scrum individual alrededor de los proyectos
 * del cursus. Las tablas `agenda_*` ya eran de la réplica (los eventos de 42),
 * así que estas se llaman `scrum_*`.
 *
 * - `scrum_goals`: cada meta («entrego ft_printf antes del viernes»), con su
 *   avance, lo que queda y si sigue en marcha. Se guarda el nombre y el tipo
 *   del proyecto para no depender de la réplica al enseñarla.
 * - `scrum_checkpoints`: los de cada meta; `key` es de la lista cerrada y
 *   `text`, uno propio. `done_at` dice si está hecho y cuándo.
 * - `scrum_entries`: dailies y weeklies, uno por meta, tipo y día (el lunes, en
 *   el weekly). Lo que se elige va en claves de listas cerradas, para que se
 *   pueda contar; `problem_other` y `solution_other` solo con «Otro».
 *
 * Las tres llevan el login: van en la descarga de datos y se anonimizan solas.
 * Lo que ve el grupo de un sprint se busca por `project_id`, sin tabla aparte.
 *
 * Tablas del módulo `agenda`.
 */

import type { Migration } from './types.js'

export const agendaScrumSchema: Migration = {
  version: 76,
  name: 'agenda-scrum',
  statements: [
    `CREATE TABLE scrum_goals (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      login        TEXT NOT NULL,
      campus_id    INTEGER NOT NULL,
      project_id   INTEGER NOT NULL,
      project_name TEXT NOT NULL,
      project_kind TEXT NOT NULL,
      target_day   TEXT NOT NULL,
      progress     INTEGER NOT NULL DEFAULT 0,
      note         TEXT,
      status       TEXT NOT NULL DEFAULT 'active',
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL,
      closed_at    TEXT
    )`,
    'CREATE INDEX scrum_goals_login ON scrum_goals (login, status)',
    'CREATE INDEX scrum_goals_project ON scrum_goals (project_id, login)',
    `CREATE TABLE scrum_checkpoints (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id  INTEGER NOT NULL,
      login    TEXT NOT NULL,
      key      TEXT,
      text     TEXT,
      position INTEGER NOT NULL,
      done_at  TEXT
    )`,
    'CREATE INDEX scrum_checkpoints_goal ON scrum_checkpoints (goal_id)',
    `CREATE TABLE scrum_entries (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id        INTEGER NOT NULL,
      login          TEXT NOT NULL,
      kind           TEXT NOT NULL,
      day            TEXT NOT NULL,
      plan           TEXT NOT NULL DEFAULT '[]',
      outcome        TEXT,
      problem        TEXT,
      problem_other  TEXT,
      solution       TEXT,
      solution_other TEXT,
      progress       INTEGER,
      note           TEXT,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL,
      UNIQUE (goal_id, kind, day)
    )`,
  ],
}
