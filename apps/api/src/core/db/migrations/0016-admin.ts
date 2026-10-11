/**
 * Administración: permisos, bloqueos, buzón (incidencias, sugerencias y
 * denuncias), consumo por persona y límites de uso.
 *
 * Tablas del módulo `admin`.
 */

import type { Migration } from './types.js'

export const adminSchema: Migration = {
  version: 16,
  name: 'administracion',
  statements: [
    // Quién administra además de los de `ADMIN_LOGINS`, que no se pueden quitar desde aquí.
    `CREATE TABLE user_roles (
        login      TEXT PRIMARY KEY,
        role       TEXT NOT NULL CHECK (role IN ('admin')),
        granted_by TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) WITHOUT ROWID`,

    // Cuentas que no pueden usar la web. `until` vacío es sin fecha de fin.
    `CREATE TABLE user_blocks (
        login      TEXT PRIMARY KEY,
        reason     TEXT NOT NULL,
        until      TEXT,
        blocked_by TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) WITHOUT ROWID`,

    // Lo que la gente manda a quien administra. `target` es de qué va una
    // denuncia: `message:12`, `board:3`, `doubt:5`.
    `CREATE TABLE tickets (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        login       TEXT NOT NULL,
        kind        TEXT NOT NULL CHECK (kind IN ('issue', 'idea', 'report')),
        subject     TEXT NOT NULL,
        body        TEXT NOT NULL,
        target      TEXT,
        status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
        answer      TEXT,
        answered_by TEXT,
        created_at  TEXT NOT NULL,
        answered_at TEXT
      )`,
    `CREATE INDEX idx_tickets_status ON tickets (status, id)`,
    `CREATE INDEX idx_tickets_login ON tickets (login, id)`,

    // Peticiones y bytes servidos por persona y hora. `day` y `hour` van en UTC.
    `CREATE TABLE request_stats (
        login    TEXT NOT NULL,
        day      TEXT NOT NULL,
        hour     INTEGER NOT NULL,
        requests INTEGER NOT NULL,
        bytes    INTEGER NOT NULL,
        limited  INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (login, day, hour)
      ) WITHOUT ROWID`,
    `CREATE INDEX idx_request_stats_when ON request_stats (day, hour)`,

    // Tope por hora puesto a mano a alguien, en vez del automático.
    `CREATE TABLE user_limits (
        login    TEXT PRIMARY KEY,
        per_hour INTEGER NOT NULL
      ) WITHOUT ROWID`,
  ],
}
