/**
 * Las horas que cada persona lleva conectada a ordenadores del clúster, según
 * 42 (`locations_stats`): el tercer cuadro de su estado de salud. Una fila por
 * persona con el total, que se vuelve a pedir una vez al día como mucho.
 */

import type { Migration } from './types.js'

export const userLogtimeSchema: Migration = {
  version: 80,
  name: 'user-logtime',
  statements: [
    `CREATE TABLE user_logtime (
      login      TEXT PRIMARY KEY,
      seconds    REAL NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  ],
}
