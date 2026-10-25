/**
 * El 42cursus de cada persona de los campus copiados (`docs/blackhole.md`):
 * grado, fin, black hole y si la cuenta sigue activa. Con esto se sabe quién
 * terminó el common core, quién sigue y a quién se tragó el black hole, para
 * las medias del Avance y la clasificación de quién va más rápido. Se llena con
 * `GET /v2/cursus/21/cursus_users?filter[campus_id]=…` (`replica/core-cursus.ts`),
 * una vuelta al día por campus. Es de la réplica: viene de 42.
 */

import type { Migration } from './types.js'

export const coreCursusSchema: Migration = {
  version: 77,
  name: 'core-cursus',
  statements: [
    `CREATE TABLE core_cursus (
      user_id       INTEGER PRIMARY KEY,
      login         TEXT NOT NULL,
      campus_id     INTEGER NOT NULL,
      begin_at      TEXT,
      end_at        TEXT,
      blackholed_at TEXT,
      grade         TEXT,
      active        INTEGER CHECK (active IN (0, 1)),
      alumni        INTEGER NOT NULL DEFAULT 0 CHECK (alumni IN (0, 1)),
      updated_at    TEXT NOT NULL
    )`,
    'CREATE INDEX core_cursus_login ON core_cursus (login)',
  ],
}
