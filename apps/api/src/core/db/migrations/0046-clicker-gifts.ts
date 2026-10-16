/**
 * Code Clicker: lo que le toca a cada cual del reparto de las trampas.
 *
 * Al pillar una trampa se venden los edificios de quien la hizo, se le da la
 * mitad de lo que costaron, y esa misma cantidad se reparte entre quienes nunca
 * han sido pillados. `pending_gift` es lo que tiene cada cual por cobrar: le
 * llega con su siguiente guardado (y entonces vale como escrito, `pool_bonus`).
 *
 * Tabla del módulo `clicker`.
 */

import type { Migration } from './types.js'

export const clickerGiftsSchema: Migration = {
  version: 46,
  name: 'reparto-de-las-trampas',
  statements: ['ALTER TABLE clicker ADD COLUMN pending_gift REAL NOT NULL DEFAULT 0'],
}
