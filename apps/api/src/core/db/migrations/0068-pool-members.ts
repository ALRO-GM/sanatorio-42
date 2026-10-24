/**
 * Los piscineros de cada campus (`docs/piscineros.md`): quién está en una
 * piscina en curso. De aquí sale quién ve a quién: los estudiantes no ven a
 * nadie de esta tabla y un piscinero solo ve a los de su campus. Se llena con
 * la copia de 42 (`GET /v2/cursus/9/cursus_users`, `replica/pool-members.ts`)
 * y al entrar un piscinero. Va aparte de `users` y `campus_members`, que son de
 * los estudiantes.
 */

import type { Migration } from './types.js'

export const poolMembersSchema: Migration = {
  version: 68,
  name: 'pool-members',
  statements: [
    `CREATE TABLE pool_members (
      campus_id  INTEGER NOT NULL,
      user_id    INTEGER NOT NULL,
      login      TEXT NOT NULL,
      image      TEXT,
      begin_at   TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (campus_id, user_id)
    )`,
    'CREATE INDEX pool_members_login ON pool_members (login)',
  ],
}
