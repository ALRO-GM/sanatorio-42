/**
 * Code Clicker: lo que hace falta para revisar las trampas.
 *
 * - `clicker_cheats`: la partida que se rechazó por tramposa, tal como llegó.
 *   Si resulta que no lo era, el indulto la pone en curso y borra la copia.
 *   `title_before` es el título que lucía antes de ponerle el de hacker.
 * - `clicker_capital`: el capital de cada quien (líneas sin gastar, lo que
 *   costó lo que tiene y lo que deben los bugs). `at` es el segundo desde 1970.
 *   Lo del último día va cada diez segundos; lo de la última semana se deja en
 *   un punto por hora y lo anterior en uno por día, y así no se borra nunca.
 * - `clicker_alerts`: saltos de capital demasiado grandes en pocos segundos que
 *   no se han dado por trampa, para que quien administra los mire. `trace` es
 *   el capital segundo a segundo alrededor del salto.
 *
 * Tablas del módulo `clicker`.
 */

import type { Migration } from './types.js'

export const clickerCapitalSchema: Migration = {
  version: 30,
  name: 'code-clicker-capital',
  statements: [
    `CREATE TABLE clicker_cheats (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        login        TEXT NOT NULL,
        at           TEXT NOT NULL,
        why          TEXT NOT NULL,
        save         TEXT NOT NULL,
        total        REAL NOT NULL,
        per_second   REAL NOT NULL,
        achievements INTEGER NOT NULL,
        prestige     INTEGER NOT NULL,
        title_before TEXT
      )`,
    'CREATE INDEX idx_clicker_cheats_login ON clicker_cheats (login, id)',
    `CREATE TABLE clicker_capital (
        login   TEXT NOT NULL,
        at      INTEGER NOT NULL,
        capital REAL NOT NULL,
        PRIMARY KEY (login, at)
      ) WITHOUT ROWID`,
    `CREATE TABLE clicker_alerts (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        login        TEXT NOT NULL,
        at           TEXT NOT NULL,
        seconds      INTEGER NOT NULL,
        from_capital REAL NOT NULL,
        to_capital   REAL NOT NULL,
        golden       INTEGER NOT NULL,
        trace        TEXT NOT NULL
      )`,
  ],
}
