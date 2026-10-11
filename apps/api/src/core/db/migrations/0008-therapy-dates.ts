/**
 * Las terapias de grupo pasan de repetirse cada semana ("martes y jueves") a
 * quedar en días concretos.
 *
 * - `dates`: los días de quedada (`YYYY-MM-DD`, separados por comas), en la
 *   hora local del campus.
 * - `last_date`: el último de ellos, para poder cerrar con una consulta los
 *   grupos que ya han pasado.
 *
 * La columna `days` se quita. Los grupos que existieran quedan sin días: como
 * no se puede saber qué semanas querían, quien los abrió tendrá que editarlos.
 *
 * Tabla del módulo `therapy`.
 */

import type { Migration } from './types.js'

export const therapyDatesSchema: Migration = {
  version: 8,
  name: 'terapias-por-dias',
  statements: [
    `ALTER TABLE therapy_groups ADD COLUMN dates TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE therapy_groups ADD COLUMN last_date TEXT`,
    `ALTER TABLE therapy_groups DROP COLUMN days`,
  ],
}
