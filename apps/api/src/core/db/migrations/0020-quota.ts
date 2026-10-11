/**
 * Cuota de la API de 42: cuánto se gasta cada día y la cola de quienes esperan
 * a que haya cuota para que se refresquen sus datos.
 *
 * Tablas del módulo `replica`.
 */

import type { Migration } from './types.js'

export const quotaSchema: Migration = {
  version: 20,
  name: 'cuota-de-42',
  statements: [
    // Peticiones hechas a 42 cada día (UTC), para repartir un tope diario o mensual.
    `CREATE TABLE forty_two_stats (
        day      TEXT PRIMARY KEY,
        requests INTEGER NOT NULL
      ) WITHOUT ROWID`,

    // Cola por orden de llegada. El `id` es el número del turno: quien llega
    // antes tiene uno más bajo. `served_at` vacío es que sigue esperando.
    `CREATE TABLE quota_queue (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        login      TEXT NOT NULL,
        task       TEXT NOT NULL,
        created_at TEXT NOT NULL,
        served_at  TEXT
      )`,
    `CREATE INDEX idx_quota_queue_pending ON quota_queue (served_at, id)`,
  ],
}
