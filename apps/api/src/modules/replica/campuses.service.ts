/**
 * Catálogo de campus, para el selector.
 */

import type { CampusSummary } from '@sanatorio/contracts'

import type { ReplicaRepository } from './replica.repository.js'
import type { Syncer } from './syncer.js'

export type CampusesServiceOptions = {
  replica: ReplicaRepository
  sync: Syncer
  /** Campus que se replican en segundo plano, para marcarlos en el catálogo. */
  trackedCampusIds: readonly number[]
}

export function createCampusesService(options: CampusesServiceOptions) {
  const { replica, sync, trackedCampusIds } = options

  return {
    async list(): Promise<CampusSummary[]> {
      const campuses = await replica.listCampuses(trackedCampusIds)

      if (campuses.length > 0) {
        return campuses
      }

      // Catálogo aún sin bajar (primer arranque): se pide ahora. Es una
      // petición y vale para una semana.
      try {
        await sync.syncCatalog()
      } catch {
        return []
      }

      return replica.listCampuses(trackedCampusIds)
    },
  }
}

export type CampusesService = ReturnType<typeof createCampusesService>
