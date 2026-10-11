/**
 * API de mentira: cuota de 42, estado de la réplica y red de correcciones.
 */

import { ME, PEERS } from './data'
import { mockNetwork, mockPair, mockPeople, mockStrictest } from './network'
import type { Api } from '../types'
import { delay, quotaSettings, quotaQueue, quotaStatus } from './state'

export const replicaMock: Pick<
  Api,
  | 'getQuota'
  | 'getAdminQuota'
  | 'setAdminQuota'
  | 'getSyncStatus'
  | 'getNetwork'
  | 'getNetworkPair'
  | 'getNetworkStrictest'
  | 'getNetworkMine'
  | 'searchNetworkPeople'
> = {
  // En la web de mentira la cuota va bien hasta que se pone el modo ahorro en
  // el panel: entonces hay cola, y avanza un turno cada vez que se pregunta.
  async getQuota() {
    await delay(100)

    if (!quotaSettings.saving) {
      quotaQueue.ahead = 5

      return { level: 'ok', ticket: null }
    }

    const ahead = quotaQueue.ahead

    quotaQueue.ahead = Math.max(0, quotaQueue.ahead - 1)

    return {
      level: 'tight',
      ticket: {
        number: 'A-042',
        serving: `A-${String(41 - ahead).padStart(3, '0')}`,
        ahead,
        etaMinutes: ahead + 1,
        since: new Date(Date.now() - 120_000).toISOString(),
      },
    }
  },

  async getAdminQuota() {
    await delay(150)

    return quotaStatus()
  },

  async setAdminQuota(changes) {
    await delay(150)
    Object.assign(quotaSettings, changes)

    return quotaStatus()
  },

  async getSyncStatus() {
    await delay(100)

    return {
      running: true,
      hourlyRemaining: 1140,
      requests: 60,
      replica: { users: 4801, projectUsers: 156_671, projects: 495, present: 212 },
      campuses: [
        {
          id: 22,
          locationsAt: new Date(Date.now() - 60_000).toISOString(),
          present: 212,
          deltaAt: new Date(Date.now() - 180_000).toISOString(),
          backfill: { phase: 'done', rows: 156_671, total: 156_671 },
        },
      ],
    }
  },

  async getNetwork(params) {
    await delay(350)

    return mockNetwork(ME.login, params)
  },

  async getNetworkPair(a, b) {
    await delay(200)

    return mockPair(ME.login, a, b)
  },

  async getNetworkStrictest(min, order) {
    await delay(200)

    return mockStrictest(ME.login, min, order)
  },

  async getNetworkMine() {
    await delay(150)

    // Con media sala de espera ya te has corregido; con la otra media, no.
    return {
      partners: Object.values(PEERS)
        .flat()
        .filter((_, index) => index % 2 === 0)
        .map((peer, index) => ({
          login: peer.login,
          gave: 1 + (index % 3),
          got: index % 2,
        })),
    }
  },

  async searchNetworkPeople(q) {
    await delay(120)

    return mockPeople(ME.login, q)
  },
}
