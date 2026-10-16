/**
 * Segundo factor para el panel: el secreto TOTP de cada quien administra.
 *
 * - `secret`: cifrado (AES-256-GCM con una clave sacada de `SESSION_SECRET`):
 *   una copia de la base no basta para sacar códigos.
 * - `confirmed_at`: `NULL` mientras no se haya probado con un código; hasta
 *   entonces se puede volver a generar.
 * - `used_step`: el último paso de 30 s usado, para que un código no valga dos veces.
 *
 * Si alguien pierde el móvil, se borra su fila por SSH y vuelve a darse de alta:
 * `DELETE FROM admin_second_factor WHERE login = '…'`.
 *
 * Tabla del módulo `admin`.
 */

import type { Migration } from './types.js'

export const secondFactorSchema: Migration = {
  version: 41,
  name: 'segundo-factor-del-panel',
  statements: [
    `CREATE TABLE admin_second_factor (
        login        TEXT PRIMARY KEY,
        secret       TEXT NOT NULL,
        confirmed_at TEXT,
        used_step    INTEGER,
        created_at   TEXT NOT NULL
      ) WITHOUT ROWID`,
  ],
}
