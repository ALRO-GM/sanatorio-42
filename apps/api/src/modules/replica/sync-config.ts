/**
 * Configuración del sincronizador a partir del entorno.
 *
 * En un sitio aparte para que el servidor y los comandos de `cli/` monten
 * exactamente el mismo sincronizador: si cada uno tradujera el entorno a su
 * manera, `npm run sync:run` y el servidor podrían ir a ritmos distintos.
 */

import type { Env } from '../../config/env.js'
import type { SyncerConfig } from './syncer.js'

export function syncConfigFrom(env: Env): SyncerConfig {
  return {
    trackedCampusIds: env.syncCampusIds,
    defaultCampusId: env.DEFAULT_CAMPUS_ID,
    hourlyReserve: env.SYNC_HOURLY_RESERVE,
    backfillIntervalMs: env.SYNC_BACKFILL_INTERVAL_MS,
    locationsTtlMs: env.LOCATIONS_TTL_SECONDS * 1000,
    locationsIdleMs: env.LOCATIONS_IDLE_SECONDS * 1000,
    deltaTtlMs: env.DELTA_TTL_SECONDS * 1000,
    deltaIdleMs: env.DELTA_IDLE_SECONDS * 1000,
    requestPageBudget: env.PEERS_PAGE_BUDGET,
  }
}
