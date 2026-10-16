/**
 * Puestos que no funcionan, y a cuánta gente se ha avisado de un grupo.
 *
 * `broken_seats`: cualquiera puede decir que un puesto está roto; vale siete
 * días (lo que suele tardar en arreglarse) y mientras tanto sale en el mapa y
 * no se propone para una terapia. Tabla del módulo `map`.
 *
 * `therapy_groups.invited`: a cuántas personas que hacen el proyecto se les
 * avisó del grupo; `NULL` si aún no. Se avisa una sola vez por grupo.
 */

import type { Migration } from './types.js'

export const brokenSeatsSchema: Migration = {
  version: 48,
  name: 'puestos-rotos',
  statements: [
    `CREATE TABLE broken_seats (
      campus_id   INTEGER NOT NULL,
      host        TEXT NOT NULL,
      login       TEXT NOT NULL,
      reported_at TEXT NOT NULL,
      PRIMARY KEY (campus_id, host)
    )`,
    'CREATE INDEX idx_broken_seats_login ON broken_seats (login)',
    'ALTER TABLE therapy_groups ADD COLUMN invited INTEGER',
  ],
}
