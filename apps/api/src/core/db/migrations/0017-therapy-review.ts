/**
 * Terapias de repaso, cómo lleva cada quien el proyecto y especialistas que se
 * ofrecen a preevaluar.
 *
 * Tablas de los módulos `therapy` y `profile`.
 */

import type { Migration } from './types.js'

export const therapyReviewSchema: Migration = {
  version: 17,
  name: 'terapias-de-repaso',
  statements: [
    // `study`: para sacar el proyecto adelante · `review`: ya está terminado y
    // se queda para repasarlo y buscarle fallos antes de presentarlo.
    `ALTER TABLE therapy_groups ADD COLUMN kind TEXT NOT NULL DEFAULT 'study'`,
    // Cómo lleva el proyecto cada persona al apuntarse, de 0 a 100. NULL si no lo dijo.
    `ALTER TABLE therapy_members ADD COLUMN progress INTEGER`,
    // 1 si esa persona se ofrece a preevaluar proyectos terminados de los que ya aprobó.
    `ALTER TABLE profiles ADD COLUMN pre_review INTEGER NOT NULL DEFAULT 0`,
  ],
}
