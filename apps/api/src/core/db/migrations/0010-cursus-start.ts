/**
 * Cuándo empezó cada persona el 42cursus.
 *
 * De esa fecha se cuentan los días límite de cada círculo (el *pace*). Llega con
 * el perfil del login, junto al nivel.
 *
 * Tabla del módulo `replica`.
 */

import type { Migration } from './types.js'

export const cursusStartSchema: Migration = {
  version: 10,
  name: 'inicio-del-cursus',
  statements: [`ALTER TABLE user_levels ADD COLUMN begin_at TEXT`],
}
