/**
 * Code Clicker: los repartos que ha cobrado cada cual en la última hora.
 *
 * Un reparto sube el capital de golpe. `gifts` guarda cuándo llegó cada uno y
 * cuánto era (`[[segundo, líneas], …]`), para que el aviso de saltos descuente
 * el premio y solo mire lo que sube por encima.
 *
 * Tabla del módulo `clicker`.
 */

import type { Migration } from './types.js'

export const clickerGiftLogSchema: Migration = {
  version: 47,
  name: 'repartos-cobrados',
  statements: ["ALTER TABLE clicker ADD COLUMN gifts TEXT NOT NULL DEFAULT '[]'"],
}
