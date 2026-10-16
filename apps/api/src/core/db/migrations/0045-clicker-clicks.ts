/**
 * Code Clicker: el contador de pulsaciones de cada guardado que entra, con la
 * hora del servidor. Con él se ve quien pulsa más de lo que aguanta una persona
 * en tramos largos (`clicks.rules.ts`). Se guarda lo justo para el tramo más
 * largo, un día y poco; lo anterior se borra al guardar.
 *
 * Tabla del módulo `clicker`.
 */

import type { Migration } from './types.js'

export const clickerClicksSchema: Migration = {
  version: 45,
  name: 'pulsaciones-de-code-clicker',
  statements: [
    `CREATE TABLE clicker_clicks (
        login  TEXT NOT NULL,
        at     INTEGER NOT NULL,
        clicks REAL NOT NULL,
        PRIMARY KEY (login, at)
      ) WITHOUT ROWID`,
  ],
}
