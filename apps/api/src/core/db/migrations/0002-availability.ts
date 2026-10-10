/**
 * Guardia: quién se ha marcado como disponible para ayudar.
 *
 * Este dato no existe en la API de 42: nadie publica allí si está disponible.
 * Va por `login` y sin clave foránea a la réplica, para que marcarse de guardia
 * no dependa de qué se haya copiado ya.
 *
 * Tabla del módulo `peers`.
 */

import type { Migration } from './types.js'

export const availabilitySchema: Migration = {
  version: 2,
  name: 'guardia',
  statements: [
    `CREATE TABLE availability (
        login      TEXT PRIMARY KEY,
        available  INTEGER NOT NULL DEFAULT 0 CHECK (available IN (0, 1)),
        updated_at TEXT NOT NULL
      )`,
  ],
}
