/**
 * Correcciones entre estudiantes: quién ha corregido a quién, de qué proyecto y
 * cuándo. Es de donde sale la red de correcciones y el cálculo de endogamia.
 *
 * Se copia de `GET /v2/scale_teams?filter[campus_id]=…&filter[cursus_id]=21`
 * (Madrid: unas 82 000 filas, 820 peticiones una sola vez). Una fila por persona
 * corregida: en un proyecto de grupo, la misma corrección da varias.
 *
 * Solo se guarda quién, a quién, qué y cuándo. Los comentarios y el feedback que
 * manda la API no llegan a la base.
 *
 * Tabla del módulo `network`.
 */

import type { Migration } from './types.js'

export const correctionsSchema: Migration = {
  version: 12,
  name: 'correcciones',
  statements: [
    `CREATE TABLE corrections (
        id         INTEGER NOT NULL,
        campus_id  INTEGER NOT NULL,
        corrector  TEXT NOT NULL,
        corrected  TEXT NOT NULL,
        project_id INTEGER,
        begin_at   TEXT NOT NULL,
        final_mark INTEGER,
        -- 1 si la corrección dio el proyecto por bueno, 0 si no, NULL si no se sabe.
        positive   INTEGER,
        PRIMARY KEY (id, corrected)
      ) WITHOUT ROWID`,
    // El grafo siempre filtra por campus y casi siempre por fechas.
    `CREATE INDEX idx_corrections_when ON corrections (campus_id, begin_at)`,
    `CREATE INDEX idx_corrections_corrector ON corrections (campus_id, corrector)`,
    `CREATE INDEX idx_corrections_corrected ON corrections (campus_id, corrected)`,
  ],
}
