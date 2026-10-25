/**
 * De qué cursus es cada corrección (`docs/piscineros.md`): hasta ahora solo se
 * copiaban las del 42cursus (`21`); ahora también las de la C Piscine (`9`) de
 * la piscina en curso, para la red de los piscineros. Todo lo que ya había es
 * del 42cursus.
 *
 * El índice es para las lecturas de la red, que siempre miran un campus y un
 * cursus (y casi siempre unas fechas): sin él, la red de la piscina recorrería
 * todas las correcciones del campus para quedarse con unas pocas.
 *
 * Tabla del módulo `network`.
 */

import type { Migration } from './types.js'

export const correctionsCursusSchema: Migration = {
  version: 69,
  name: 'corrections-cursus',
  statements: [
    'ALTER TABLE corrections ADD COLUMN cursus INTEGER NOT NULL DEFAULT 21',
    'CREATE INDEX idx_corrections_cursus ON corrections (campus_id, cursus, begin_at)',
  ],
}
