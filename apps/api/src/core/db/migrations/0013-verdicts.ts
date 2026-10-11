/**
 * El veredicto de cada corrección, sacado de la nota.
 *
 * La marca que pone quien corrige (`positive`) no vale sola: 42 guarda "Ok"
 * también en correcciones con un 0. Una corrección aprueba si la marca es buena
 * **y** la nota llega a la mínima del proyecto, que se aprende de cómo han
 * acabado los proyectos de la gente (`project_pass_marks`).
 *
 * Tablas del módulo `network`.
 */

import type { Migration } from './types.js'

export const verdictsSchema: Migration = {
  version: 13,
  name: 'veredictos',
  statements: [
    // 1 si la corrección aprobó, 0 si suspendió, NULL hasta que se calcula.
    `ALTER TABLE corrections ADD COLUMN passed INTEGER`,
    `CREATE TABLE project_pass_marks (
        project_id INTEGER PRIMARY KEY,
        pass_mark  INTEGER NOT NULL
      ) WITHOUT ROWID`,
  ],
}
