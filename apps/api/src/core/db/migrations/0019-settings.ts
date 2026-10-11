/**
 * Ajustes que se cambian desde el panel sin tocar la configuración ni
 * reiniciar: hoy, el presupuesto de peticiones.
 *
 * Cada fila es un grupo de ajustes en JSON. Lo que falte en el JSON vale lo que
 * diga el código, así que añadir un ajuste nuevo no necesita migración.
 *
 * Tabla del módulo `admin`.
 */

import type { Migration } from './types.js'

export const settingsSchema: Migration = {
  version: 19,
  name: 'ajustes',
  statements: [
    `CREATE TABLE settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        updated_at TEXT NOT NULL
      ) WITHOUT ROWID`,
  ],
}
