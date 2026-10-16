/**
 * Los avisos del buzón se pueden guardar y borrar. Uno guardado no se va al
 * borrar «todos los leídos»: es lo que se quiere conservar.
 *
 * Tabla del módulo `notices`.
 */

import type { Migration } from './types.js'

export const savedNoticesSchema: Migration = {
  version: 40,
  name: 'avisos-guardados',
  statements: [
    `ALTER TABLE notices ADD COLUMN saved INTEGER NOT NULL DEFAULT 0 CHECK (saved IN (0, 1))`,
  ],
}
