/**
 * Code Clicker: las trampas. Cuántas veces han pillado a alguien, cuándo y por
 * qué, y si le queda pendiente la venta forzosa de todo lo que tiene.
 *
 * `last_total` es el total del último guardado que entró. `total` no sirve para
 * medir cuánto se ha escrito desde entonces, porque nunca baja aunque se empiece
 * una partida nueva.
 *
 * Tabla del módulo `clicker`.
 */

import type { Migration } from './types.js'

export const clickerCaughtSchema: Migration = {
  version: 29,
  name: 'code-clicker-caught',
  statements: [
    'ALTER TABLE clicker ADD COLUMN last_total REAL NOT NULL DEFAULT 0',
    'ALTER TABLE clicker ADD COLUMN caught INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE clicker ADD COLUMN caught_at TEXT',
    'ALTER TABLE clicker ADD COLUMN caught_why TEXT',
    'ALTER TABLE clicker ADD COLUMN sale_due INTEGER NOT NULL DEFAULT 0',
    // Las partidas que ya había parten de lo que tenían: si no, su primer
    // guardado parecería haberlo escrito todo de golpe.
    'UPDATE clicker SET last_total = total',
  ],
}
