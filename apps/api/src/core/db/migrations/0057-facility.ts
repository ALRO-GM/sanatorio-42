/**
 * Avisos al staff de problemas del edificio o de los ordenadores (#77 del
 * buzón): qué pasa, dónde, quién avisa y si ya está resuelto.
 */

import type { Migration } from './types.js'

export const facilitySchema: Migration = {
  version: 57,
  name: 'facility-reports',
  statements: [
    `CREATE TABLE facility_reports (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      campus_id   INTEGER NOT NULL,
      login       TEXT NOT NULL,
      category    TEXT NOT NULL,
      place       TEXT NOT NULL,
      note        TEXT,
      created_at  TEXT NOT NULL,
      resolved_at TEXT,
      resolved_by TEXT
    )`,
    'CREATE INDEX idx_facility_open ON facility_reports (resolved_at, campus_id, id)',
    'CREATE INDEX idx_facility_login ON facility_reports (login, created_at)',
  ],
}
