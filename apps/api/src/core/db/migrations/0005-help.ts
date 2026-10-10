/**
 * Ayuda reservada, respuestas que resuelven y cambios de guía con responsables.
 *
 * - `help_*`: franjas en las que alguien se ofrece, reservas y bloqueos. Tablas
 *   del módulo `help`.
 * - `doubts.solved_*`: qué respuesta resolvió cada duda. Módulo `doubts`.
 * - `guide_changes`, `guide_change_flags`, `guide_strikes`: quién propuso y
 *   quién validó cada cambio, quién lo ha señalado y las faltas acumuladas.
 *   Módulo `doubts`.
 * - `therapy_checks`: cada comprobación de asistencia, para hacerla una sola
 *   vez por media hora. Módulo `therapy`.
 */

import type { Migration } from './types.js'

export const helpSchema: Migration = {
  version: 5,
  name: 'ayuda-y-responsables',
  statements: [
    // Lo que alguien ofrece un día: sus franjas (JSON) y su tope de minutos.
    `CREATE TABLE help_days (
        login       TEXT NOT NULL,
        campus_id   INTEGER NOT NULL,
        day         TEXT NOT NULL,
        windows     TEXT NOT NULL DEFAULT '[]',
        max_minutes INTEGER NOT NULL,
        updated_at  TEXT NOT NULL,
        PRIMARY KEY (login, day)
      ) WITHOUT ROWID`,
    `CREATE INDEX idx_help_days_campus ON help_days (campus_id, day)`,

    // Las horas van en minutos desde medianoche, en la hora local del campus.
    `CREATE TABLE help_bookings (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        campus_id        INTEGER NOT NULL,
        helper           TEXT NOT NULL,
        requester        TEXT NOT NULL,
        project_id       INTEGER,
        day              TEXT NOT NULL,
        start_min        INTEGER NOT NULL,
        minutes          INTEGER NOT NULL,
        note             TEXT,
        status           TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled')),
        verified         INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
        helper_tag       TEXT,
        requester_tag    TEXT,
        xp               INTEGER,
        created_at       TEXT NOT NULL
      )`,
    `CREATE INDEX idx_help_bookings_helper ON help_bookings (helper, day)`,
    `CREATE INDEX idx_help_bookings_requester ON help_bookings (requester, day)`,

    `CREATE TABLE help_blocks (
        blocker    TEXT NOT NULL,
        blocked    TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (blocker, blocked)
      ) WITHOUT ROWID`,

    `ALTER TABLE doubts ADD COLUMN solved_answer_id INTEGER`,
    `ALTER TABLE doubts ADD COLUMN solved_at TEXT`,

    `CREATE TABLE guide_changes (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        campus_id   INTEGER NOT NULL,
        project_id  INTEGER NOT NULL,
        section     TEXT NOT NULL CHECK (section IN ('start', 'problems', 'concepts')),
        body        TEXT NOT NULL,
        proposer    TEXT NOT NULL,
        validator   TEXT NOT NULL,
        rewarded    INTEGER NOT NULL DEFAULT 0 CHECK (rewarded IN (0, 1)),
        accepted_at TEXT NOT NULL,
        revoked_at  TEXT
      )`,
    `CREATE INDEX idx_guide_changes_project ON guide_changes (campus_id, project_id)`,
    `CREATE TABLE guide_change_flags (
        change_id  INTEGER NOT NULL,
        login      TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (change_id, login)
      ) WITHOUT ROWID`,
    // Una falta por cada cambio rechazado o retirado. Cada tres, un mes de bloqueo.
    `CREATE TABLE guide_strikes (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        login      TEXT NOT NULL,
        role       TEXT NOT NULL CHECK (role IN ('proposer', 'validator')),
        created_at TEXT NOT NULL
      )`,
    `CREATE INDEX idx_guide_strikes_login ON guide_strikes (login, role)`,

    `CREATE TABLE therapy_checks (
        group_id   INTEGER NOT NULL,
        day        TEXT NOT NULL,
        slot       INTEGER NOT NULL,
        present    TEXT NOT NULL,
        checked_at TEXT NOT NULL,
        PRIMARY KEY (group_id, day, slot)
      ) WITHOUT ROWID`,
  ],
}
