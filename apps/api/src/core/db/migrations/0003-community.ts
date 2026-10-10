/**
 * Comunidad: perfiles, XP, reacciones, terapias de grupo, tablón de dudas y
 * pizarras.
 *
 * Nada de esto viene de 42. Todo va por `login` y con el campus al que
 * pertenece, para no mezclar listas entre sedes.
 *
 * Tablas de los módulos `profile`, `therapy`, `doubts` y `boards`.
 */

import type { Migration } from './types.js'

export const communitySchema: Migration = {
  version: 3,
  name: 'comunidad',
  statements: [
    // Preferencias de quien entra.
    `CREATE TABLE profiles (
        login      TEXT PRIMARY KEY,
        campus_id  INTEGER,
        lang       TEXT,
        title      TEXT,
        created_at TEXT NOT NULL,
        seen_at    TEXT NOT NULL
      )`,

    // Libro de XP. Nunca se guarda un total: se suma. La restricción única es
    // lo que impide cobrar dos veces lo mismo (misma sesión, misma pizarra).
    `CREATE TABLE xp_events (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        login      TEXT NOT NULL,
        kind       TEXT NOT NULL,
        amount     INTEGER NOT NULL,
        ref        TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (login, kind, ref)
      )`,
    `CREATE INDEX idx_xp_events_login ON xp_events (login)`,

    // "¿Cómo te ayudó?": una por pareja y día.
    `CREATE TABLE reactions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        from_login  TEXT NOT NULL,
        to_login    TEXT NOT NULL,
        kind        TEXT NOT NULL CHECK (kind IN ('bug', 'code', 'concept', 'patient')),
        project_id  INTEGER,
        specialist  INTEGER NOT NULL DEFAULT 0 CHECK (specialist IN (0, 1)),
        day         TEXT NOT NULL,
        created_at  TEXT NOT NULL,
        UNIQUE (from_login, to_login, day)
      )`,
    `CREATE INDEX idx_reactions_to ON reactions (to_login)`,

    // Terapias de grupo.
    `CREATE TABLE therapy_groups (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        campus_id   INTEGER NOT NULL,
        project_id  INTEGER NOT NULL,
        creator     TEXT NOT NULL,
        place       TEXT NOT NULL,
        days        TEXT NOT NULL,
        start_time  TEXT NOT NULL,
        end_time    TEXT NOT NULL,
        capacity    INTEGER NOT NULL,
        note        TEXT,
        closed      INTEGER NOT NULL DEFAULT 0 CHECK (closed IN (0, 1)),
        created_at  TEXT NOT NULL
      )`,
    `CREATE INDEX idx_therapy_groups_campus ON therapy_groups (campus_id, closed)`,
    `CREATE TABLE therapy_members (
        group_id  INTEGER NOT NULL,
        login     TEXT NOT NULL,
        joined_at TEXT NOT NULL,
        PRIMARY KEY (group_id, login)
      ) WITHOUT ROWID`,

    // Tablón de dudas.
    `CREATE TABLE doubts (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        campus_id  INTEGER NOT NULL,
        project_id INTEGER NOT NULL,
        author     TEXT NOT NULL,
        body       TEXT NOT NULL,
        color      INTEGER NOT NULL DEFAULT 0,
        resolved   INTEGER NOT NULL DEFAULT 0 CHECK (resolved IN (0, 1)),
        created_at TEXT NOT NULL
      )`,
    `CREATE INDEX idx_doubts_project ON doubts (campus_id, project_id)`,
    `CREATE TABLE doubt_answers (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        doubt_id   INTEGER NOT NULL,
        author     TEXT NOT NULL,
        body       TEXT NOT NULL,
        specialist INTEGER NOT NULL DEFAULT 0 CHECK (specialist IN (0, 1)),
        created_at TEXT NOT NULL
      )`,
    `CREATE INDEX idx_doubt_answers_doubt ON doubt_answers (doubt_id)`,

    // Guía de cada proyecto. Las tres secciones son listas en JSON.
    `CREATE TABLE guides (
        campus_id  INTEGER NOT NULL,
        project_id INTEGER NOT NULL,
        start      TEXT NOT NULL DEFAULT '[]',
        problems   TEXT NOT NULL DEFAULT '[]',
        concepts   TEXT NOT NULL DEFAULT '[]',
        updated_by TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (campus_id, project_id)
      ) WITHOUT ROWID`,
    `CREATE TABLE guide_proposals (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        campus_id  INTEGER NOT NULL,
        project_id INTEGER NOT NULL,
        author     TEXT NOT NULL,
        section    TEXT NOT NULL CHECK (section IN ('start', 'problems', 'concepts')),
        body       TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
    `CREATE INDEX idx_guide_proposals_project ON guide_proposals (campus_id, project_id)`,

    // Pizarras.
    `CREATE TABLE boards (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        campus_id   INTEGER NOT NULL,
        host        TEXT NOT NULL,
        title       TEXT NOT NULL,
        topic       TEXT,
        description TEXT,
        place       TEXT NOT NULL,
        starts_at   TEXT NOT NULL,
        ends_at     TEXT NOT NULL,
        capacity    INTEGER NOT NULL,
        settled     INTEGER NOT NULL DEFAULT 0 CHECK (settled IN (0, 1)),
        created_at  TEXT NOT NULL
      )`,
    `CREATE INDEX idx_boards_campus ON boards (campus_id, starts_at)`,
    `CREATE TABLE board_attendees (
        board_id  INTEGER NOT NULL,
        login     TEXT NOT NULL,
        joined_at TEXT NOT NULL,
        PRIMARY KEY (board_id, login)
      ) WITHOUT ROWID`,
  ],
}
