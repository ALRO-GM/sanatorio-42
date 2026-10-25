/**
 * Tiempo activo en los cursos (`docs/plantilla-cursos.md`): cada vez que
 * alguien supera un punto del curso de git o del de shell, cuánto rato estuvo
 * de verdad con él (lo mide el navegador: vista abierta, pestaña a la vista y
 * algo de actividad en el último minuto) y cuánto se estimaba entonces. Con
 * eso se calibrarán las estimaciones y se podrá comparar a cada cual con lo
 * que suele tardar la gente.
 */

import type { Migration } from './types.js'

export const courseTimesSchema: Migration = {
  version: 75,
  name: 'course-times',
  statements: [
    `CREATE TABLE course_times (
      id               INTEGER PRIMARY KEY,
      login            TEXT NOT NULL,
      course           TEXT NOT NULL,
      unit             TEXT NOT NULL,
      active_seconds   INTEGER NOT NULL,
      estimate_seconds INTEGER NOT NULL,
      stars            INTEGER NOT NULL,
      first            INTEGER NOT NULL,
      at               TEXT NOT NULL
    )`,
    'CREATE INDEX course_times_unit ON course_times (course, unit)',
    'CREATE INDEX course_times_login ON course_times (login)',
  ],
}
