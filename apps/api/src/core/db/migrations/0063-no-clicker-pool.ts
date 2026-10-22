/**
 * Code Clicker: fuera la bolsa común de lo requisado (2026-10-22). Desde la
 * política de trampas nueva lo requisado se reparte directamente entre quienes
 * no han hecho trampas, y cobrar de la bolsa a la vez que se guardaba daba
 * trampas que no lo eran. Las columnas `pool_bonus` (por donde viaja el reparto
 * hasta la web) y `pool_claimed_at` se quedan.
 */

import type { Migration } from './types.js'

export const noClickerPoolSchema: Migration = {
  version: 63,
  name: 'no-clicker-pool',
  statements: ['DROP TABLE IF EXISTS clicker_pool'],
}
