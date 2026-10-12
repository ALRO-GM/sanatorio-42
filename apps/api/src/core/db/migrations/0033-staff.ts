/**
 * Documentos con código de verificación y cuentas de staff.
 *
 * - `report_exports`: cada informe de horas que alguien se descarga. Se guarda
 *   el fichero tal cual salió, con un código de cuatro caracteres que va en su
 *   nombre: con él, el staff de 42 puede comprobar que el documento que le
 *   entregan es el que emitió la web.
 * - `staff_accounts`: las cuentas que solo sirven para eso. No son de 42: las
 *   crea quien administra y se entra con una clave, de la que aquí solo queda
 *   su resumen (scrypt con sal).
 * - `staff_checks`: cada comprobación que hace el staff, para que quede rastro.
 *
 * Tablas del módulo `staff`.
 */

import type { Migration } from './types.js'

export const staffSchema: Migration = {
  version: 33,
  name: 'documentos-verificables-y-staff',
  statements: [
    `CREATE TABLE report_exports (
        code          TEXT PRIMARY KEY,
        login         TEXT NOT NULL,
        requested_by  TEXT NOT NULL,
        period_from   TEXT NOT NULL,
        period_to     TEXT NOT NULL,
        total_minutes INTEGER NOT NULL,
        row_count     INTEGER NOT NULL,
        hash          TEXT NOT NULL,
        content       TEXT NOT NULL,
        created_at    TEXT NOT NULL
      ) WITHOUT ROWID`,
    // Para no emitir dos códigos para el mismo documento, y para el tope diario.
    'CREATE INDEX report_exports_by_requester ON report_exports (requested_by, hash)',
    'CREATE INDEX report_exports_by_day ON report_exports (requested_by, created_at)',
    `CREATE TABLE staff_accounts (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        name         TEXT NOT NULL UNIQUE,
        key_hash     TEXT NOT NULL,
        salt         TEXT NOT NULL,
        created_by   TEXT NOT NULL,
        created_at   TEXT NOT NULL,
        last_used_at TEXT,
        revoked_at   TEXT
      )`,
    `CREATE TABLE staff_checks (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        staff      TEXT NOT NULL,
        code       TEXT NOT NULL,
        outcome    TEXT NOT NULL CHECK (outcome IN ('found', 'unknown', 'same', 'different')),
        created_at TEXT NOT NULL
      )`,
    'CREATE INDEX staff_checks_by_date ON staff_checks (created_at)',
  ],
}
