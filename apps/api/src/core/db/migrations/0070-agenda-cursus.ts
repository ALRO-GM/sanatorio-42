/**
 * De qué cursus es cada evento y examen del campus (`docs/piscineros.md`):
 * 42 los da todos juntos, los de la piscina (`9`) con los del 42cursus (`21`).
 * Se guarda la lista de ids en JSON para que el calendario de un estudiante no
 * traiga lo de la piscina y el de un piscinero solo traiga eso. Las filas de
 * antes quedan en `NULL` y cuentan como del 42cursus, que es lo que se veía.
 */

import type { Migration } from './types.js'

export const agendaCursusSchema: Migration = {
  version: 70,
  name: 'agenda-cursus',
  statements: ['ALTER TABLE agenda_events ADD COLUMN cursus TEXT'],
}
