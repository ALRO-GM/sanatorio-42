/**
 * Cuándo vio alguien la bienvenida (`profiles.welcomed_at`), pedido por Alberto
 * el 2026-11-02: solo debe salir la primera vez que se entra. Hasta ahora se
 * apuntaba solo en el navegador, y volvía en otro, en una ventana privada o
 * tras el cambio de dominio. Quien ya tiene perfil ya ha entrado antes: se da
 * por vista desde entonces.
 */

import type { Migration } from './types.js'

export const welcomedSchema: Migration = {
  version: 84,
  name: 'welcomed',
  statements: [
    `ALTER TABLE profiles ADD COLUMN welcomed_at TEXT`,
    `UPDATE profiles SET welcomed_at = created_at`,
  ],
}
