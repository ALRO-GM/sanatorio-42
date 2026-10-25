import type { BroadcastReport } from '@sanatorio/contracts'

/**
 * API de mentira: cuota de 42, estado de la réplica y red de correcciones.
 */

import { ME, PEERS } from './data'
import { mockNetwork, mockPair, mockPeople, mockSeats, mockStrictest } from './network'
import { helpInbox } from './help'
import type { Api } from '../types'
import { clickerMock } from './clicker'
import { countdownPulse } from './countdowns'
import { delay, notices, quotaSettings, quotaQueue, quotaStatus } from './state'

/**
 * Los comunicados de la web de mentira. Con `?comunicado` en la dirección hay
 * uno esperando, de los que no se cierran sin elegir.
 */
const casts: BroadcastReport[] = new URLSearchParams(window.location.search).has('comunicado')
  ? [
      {
        id: 1,
        from: 'albrodri',
        title: '¿Vienes a la charla del jueves?',
        body: 'Jueves a las 17:00 en el cluster 2: cómo preparar la corrección de minishell.',
        options: ['Sí', 'No', 'Aún no lo sé'],
        required: true,
        audience: { kind: 'all' },
        at: new Date().toISOString(),
        counts: [0, 0, 0],
        seen: 0,
        answers: [],
      },
    ]
  : []

/** Los que quien mira aún no ha contestado. */
const pendingCasts = (): BroadcastReport[] =>
  casts.filter((cast) => !cast.answers.some((answer) => answer.login === ME.login))

/** Las revisiones de mentira por contestar: las lleva el simulado del juego. */
const pendingReviews = async (): Promise<number> => (await clickerMock.getClickerReviews()).length

export const replicaMock: Pick<
  Api,
  | 'getPulse'
  | 'getBroadcasts'
  | 'answerBroadcast'
  | 'getAdminBroadcasts'
  | 'sendBroadcast'
  | 'removeBroadcast'
  | 'getAdminQuota'
  | 'setAdminQuota'
  | 'getSyncStatus'
  | 'getNetwork'
  | 'getNetworkPair'
  | 'getNetworkStrictest'
  | 'getSeatGraph'
  | 'getNetworkMine'
  | 'searchNetworkPeople'
> = {
  // En la web de mentira la cuota va bien hasta que se pone el modo ahorro en
  // el panel: entonces hay cola, y avanza un turno cada vez que se pregunta.
  async getBroadcasts() {
    await delay(100)

    return pendingCasts().map(
      ({ audience: _audience, counts: _counts, seen: _seen, answers: _answers, ...cast }) => cast,
    )
  },

  async answerBroadcast(id, { option }) {
    await delay(100)

    const cast = casts.find((entry) => entry.id === id)

    if (cast !== undefined) {
      cast.answers.push({ login: ME.login, option, at: new Date().toISOString() })
      if (option === null) cast.seen += 1
      else cast.counts[option] = (cast.counts[option] ?? 0) + 1
    }

    return this.getBroadcasts()
  },

  async getAdminBroadcasts() {
    await delay()

    return [...casts].reverse()
  },

  async sendBroadcast(message) {
    await delay(150)

    const cast: BroadcastReport = {
      id: casts.length + 1,
      from: ME.login,
      title: message.title,
      body: message.body,
      options: message.options ?? [],
      required: message.required ?? false,
      audience: message.audience,
      at: new Date().toISOString(),
      counts: (message.options ?? []).map(() => 0),
      seen: 0,
      answers: [],
    }

    casts.push(cast)

    return cast
  },

  async removeBroadcast(id) {
    await delay(100)
    casts.splice(
      casts.findIndex((entry) => entry.id === id),
      1,
    )
  },

  async getPulse() {
    await delay(100)

    const unread = notices.filter((notice) => !notice.read).length

    if (!quotaSettings.saving) {
      quotaQueue.ahead = 5

      return {
        unread,
        broadcasts: pendingCasts().length,
        clickerReviews: await pendingReviews(),
        help: helpInbox().requests.length + helpInbox().news.length,
        examLive: true,
        ...countdownPulse(),
        quota: { level: 'ok', ticket: null },
      }
    }

    const ahead = quotaQueue.ahead

    quotaQueue.ahead = Math.max(0, quotaQueue.ahead - 1)

    return {
      unread,
      broadcasts: pendingCasts().length,
      clickerReviews: await pendingReviews(),
      help: helpInbox().requests.length + helpInbox().news.length,
      examLive: true,
      ...countdownPulse(),
      quota: {
        level: 'tight',
        ticket: {
          number: 'A-042',
          serving: `A-${String(41 - ahead).padStart(3, '0')}`,
          ahead,
          etaMinutes: ahead + 1,
          since: new Date(Date.now() - 120_000).toISOString(),
        },
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

  async getSeatGraph(days) {
    await delay(200)

    return mockSeats(ME.login, days)
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
