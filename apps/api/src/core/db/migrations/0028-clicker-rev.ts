/**
 * Code Clicker: quién tiene la partida y cuántas veces se ha guardado.
 *
 * Sin esto, dos dispositivos abiertos a la vez se pisaban: ganaba el último en
 * guardar, aunque llevara una partida más vieja. `rev` sube con cada guardado y
 * `holder` es la pestaña que hizo el último; un guardado solo entra si viene de
 * esa pestaña o si partió de la `rev` que hay.
 *
 * Tabla del módulo `clicker`.
 */

import type { Migration } from './types.js'

export const clickerRevSchema: Migration = {
  version: 28,
  name: 'code-clicker-rev',
  statements: [
    'ALTER TABLE clicker ADD COLUMN rev INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE clicker ADD COLUMN holder TEXT',
  ],
}
