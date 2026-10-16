/**
 * El círculo aprendido de cada proyecto pasa de «el más bajo que se haya visto»
 * a un voto por persona (`curriculum.rules.ts`).
 *
 * Con el mínimo bastaba un caso raro para bajar un proyecto de círculo para
 * siempre: una sola persona dejó el Python Module 06 bis en el círculo 0. Ahora
 * se guarda lo que dice cada persona y gana el círculo en el que coincide
 * bastante gente.
 *
 * Los votos se rellenan con lo que ya se sabía de cada cual (sus rangos y la
 * fecha en que se apuntó a cada proyecto), así que no se pierde lo aprendido.
 * La tabla vieja, que solo guardaba el mínimo, desaparece.
 *
 * Tabla del módulo `replica`.
 */

import type { Migration } from './types.js'

export const curriculumVotesSchema: Migration = {
  version: 37,
  name: 'plan-de-estudios-por-votos',
  statements: [
    `CREATE TABLE curriculum_votes (
        track      TEXT NOT NULL CHECK (track IN ('classic', 'next')),
        project_id INTEGER NOT NULL,
        login      TEXT NOT NULL,
        circle     INTEGER NOT NULL CHECK (circle >= 0),
        PRIMARY KEY (track, project_id, login)
      ) WITHOUT ROWID`,
    `INSERT OR IGNORE INTO curriculum_votes (track, project_id, login, circle)
      SELECT ut.track, pu.project_id, ut.login,
             (SELECT COUNT(*) FROM json_each(ut.ranks) AS rank WHERE rank.value <= pu.created_at_42)
        FROM user_tracks ut
        JOIN users u ON u.login = ut.login
        JOIN project_users pu ON pu.user_id = u.id
        JOIN projects p ON p.id = pu.project_id
       WHERE p.core = 1 AND pu.created_at_42 IS NOT NULL AND json_valid(ut.ranks)`,
    `DROP TABLE curriculum`,
  ],
}
