/**
 * Mapa de calor de clics (#69 del buzón): cuántos clics hay en cada elemento y
 * en cada casilla de una rejilla normalizada, por día, sección y forma de la
 * pantalla (móvil u ordenador). Sin login: solo cuentas.
 */

import type { Migration } from './types.js'

export const usageClicksSchema: Migration = {
  version: 58,
  name: 'usage-clicks',
  statements: [
    `CREATE TABLE usage_click_cells (
      day     TEXT NOT NULL,
      section TEXT NOT NULL,
      layout  TEXT NOT NULL,
      x       INTEGER NOT NULL,
      y       INTEGER NOT NULL,
      n       INTEGER NOT NULL,
      PRIMARY KEY (day, section, layout, x, y)
    ) WITHOUT ROWID`,
    `CREATE TABLE usage_click_elements (
      day         TEXT NOT NULL,
      section     TEXT NOT NULL,
      element     TEXT NOT NULL,
      interactive INTEGER NOT NULL,
      n           INTEGER NOT NULL,
      PRIMARY KEY (day, section, element, interactive)
    ) WITHOUT ROWID`,
  ],
}
