/**
 * Los mensajes del buzón dicen de qué tipo son (fallo, mejora, idea,
 * traducción, otro) y de qué sección de la web van. Antes había que ponerles un
 * título, y no se sabía de dónde venían.
 *
 * Los de antes se quedan sin tipo ni sección (`NULL`).
 *
 * Tabla del módulo `admin`.
 */

import type { Migration } from './types.js'

export const ticketCategorySchema: Migration = {
  version: 38,
  name: 'tipo-y-seccion-de-los-mensajes',
  statements: [
    `ALTER TABLE tickets ADD COLUMN category TEXT
       CHECK (category IN ('bug', 'improvement', 'idea', 'translation', 'other'))`,
    `ALTER TABLE tickets ADD COLUMN section TEXT`,
  ],
}
