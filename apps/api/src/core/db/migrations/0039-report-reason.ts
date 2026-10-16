/**
 * Las denuncias dicen su motivo: spam, acoso, insultos u otro. Así quien
 * administra puede filtrarlas y atender antes lo grave.
 *
 * Las de antes se quedan sin motivo (`NULL`).
 *
 * Tabla del módulo `admin`.
 */

import type { Migration } from './types.js'

export const reportReasonSchema: Migration = {
  version: 39,
  name: 'motivo-de-las-denuncias',
  statements: [
    `ALTER TABLE tickets ADD COLUMN reason TEXT
       CHECK (reason IN ('spam', 'harassment', 'insults', 'other'))`,
  ],
}
