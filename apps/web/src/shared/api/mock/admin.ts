/**
 * API de mentira: buzón, panel de gestión, presupuesto y uso.
 */

import type { DataWipe, Ticket } from '@sanatorio/contracts'
import { ME } from './data'
import type { Api } from '../types'
import {
  delay,
  fail,
  threads,
  tickets,
  admins,
  blocks,
  limits,
  budgetSettings,
  budgetStatus,
  addNotice,
  notices,
} from './state'

export const adminMock: Pick<
  Api,
  | 'openTicket'
  | 'getMyTickets'
  | 'getAdminTickets'
  | 'answerTicket'
  | 'getNotices'
  | 'readNotices'
  | 'setAdminBudget'
  | 'getAdminConsumption'
  | 'getAdminPeople'
  | 'setAdminRole'
  | 'blockUser'
  | 'unblockUser'
  | 'setUserLimit'
  | 'getAdminMessages'
  | 'getUsage'
  | 'sendUsage'
  | 'getStats'
  | 'getUsageHeatmap'
  | 'getAdminData'
  | 'countAdminData'
  | 'deleteAdminData'
> = {
  async openTicket(ticket) {
    await delay(150)

    const created: Ticket = {
      id: tickets.length + 1,
      login: ME.login,
      kind: ticket.kind,
      subject: ticket.subject,
      body: ticket.body,
      target: ticket.target ?? null,
      status: 'open',
      answer: null,
      answeredBy: null,
      createdAt: new Date().toISOString(),
      answeredAt: null,
    }

    tickets.unshift(created)

    return created
  },

  async getMyTickets() {
    await delay(120)

    return tickets.filter((ticket) => ticket.login === ME.login)
  },

  async getAdminTickets() {
    await delay(120)

    return [...tickets].sort((a, b) => Number(b.status === 'open') - Number(a.status === 'open'))
  },

  async getNotices() {
    await delay(120)

    return {
      unread: notices.filter((notice) => !notice.read).length,
      items: [...notices].sort((a, b) => Number(a.read) - Number(b.read)),
    }
  },

  async readNotices(ids) {
    await delay(100)

    for (const notice of notices) {
      if (ids === undefined || ids.includes(notice.id)) notice.read = true
    }

    return this.getNotices()
  },

  async answerTicket(id, answer, status) {
    await delay(150)

    const ticket = tickets.find((entry) => entry.id === id)

    if (ticket === undefined) throw fail(404, 'Ese aviso no existe')

    Object.assign(ticket, {
      answer,
      status,
      answeredBy: ME.login,
      answeredAt: new Date().toISOString(),
    })
    // En la web de mentira eres quien pregunta y quien responde: el aviso te llega a ti.
    addNotice({
      kind: 'ticket_answered',
      ref: `ticket:${ticket.id}`,
      from: ME.login,
      text: ticket.subject,
    })

    return ticket
  },

  async setAdminBudget(changes) {
    await delay(200)
    Object.assign(budgetSettings, changes)

    return budgetStatus()
  },

  async getAdminConsumption() {
    await delay(200)

    const budget = 30_000
    const pattern = Array.from({ length: 7 * 24 }, (_, index) => {
      const weekday = Math.floor(index / 24)
      const hour = index % 24
      // Entre semana y por la tarde es cuando más se usa; los martes a las 17, de más.
      const day = weekday === 0 || weekday === 6 ? 0.35 : 1
      const curve = Math.max(0, Math.sin(((hour - 8) / 14) * Math.PI))
      const spike = weekday === 2 && hour >= 16 && hour <= 18 ? 1.5 : 1

      return { weekday, hour, requests: Math.round(18_000 * day * curve * spike) }
    })

    return {
      budget: budgetStatus(),
      limit: {
        budget,
        activePeople: 42,
        perPerson: Math.floor(budget / 42),
        fortyTwoRemaining: 874,
      },
      recent: Array.from({ length: 48 }, (_, index) => {
        const at = new Date(Date.now() - (47 - index) * 3_600_000)
        const requests = Math.round(
          9000 * Math.max(0.05, Math.sin(((at.getUTCHours() - 7) / 15) * Math.PI)),
        )

        return {
          day: at.toISOString().slice(0, 10),
          hour: at.getUTCHours(),
          requests,
          bytes: requests * 4200,
          people: Math.max(1, Math.round(requests / 220)),
        }
      }),
      pattern,
      warnings: pattern
        .filter((cell) => cell.requests >= budget * 0.8)
        .map((cell) => ({ ...cell, share: cell.requests / budget })),
      top: ['jdoe', 'mgarcia', 'anavarro', 'llorente', 'plopez-l'].map((login, index) => ({
        login,
        requests: 2400 - index * 410,
        bytes: (2400 - index * 410) * 5100,
        limited: index === 0 ? 37 : 0,
        manualLimit: limits.get(login) ?? null,
      })),
    }
  },

  async getAdminPeople() {
    await delay(150)

    return {
      admins: [
        { login: ME.login, fixed: true, grantedBy: null },
        ...admins.map((login) => ({ login, fixed: false, grantedBy: ME.login })),
      ],
      blocks,
      limits: [...limits].map(([login, perHour]) => ({ login, perHour })),
    }
  },

  async setAdminRole(login, admin) {
    await delay(120)

    const at = admins.indexOf(login)

    if (admin && at === -1) admins.push(login)
    if (!admin && at !== -1) admins.splice(at, 1)
  },

  async blockUser(login, reason, days) {
    await delay(120)
    blocks.unshift({
      login,
      reason,
      until: days === null ? null : new Date(Date.now() + days * 86_400_000).toISOString(),
      blockedBy: ME.login,
    })
  },

  async unblockUser(login) {
    await delay(120)
    blocks.splice(0, blocks.length, ...blocks.filter((entry) => entry.login !== login))
  },

  async setUserLimit(login, perHour) {
    await delay(120)

    if (perHour === null) limits.delete(login)
    else limits.set(login, perHour)
  },

  async getAdminMessages() {
    await delay(150)

    return [...threads]
      .flatMap(([eventId, messages]) =>
        messages.map((message) => ({
          id: message.id,
          eventId,
          login: message.login,
          kind: message.kind,
          body: message.body,
          at: message.at,
        })),
      )
      .reverse()
  },

  async getUsage() {
    await delay(100)

    // La comunidad de mentira usa sobre todo el tablón y la red.
    return {
      counts: {
        'nav.tablon': 420,
        'nav.red': 380,
        'nav.consulta': 300,
        'nav.calendario': 150,
        'nav.terapia': 90,
        'nav.pizarras': 60,
        'expediente.network': 200,
        'expediente.health': 180,
        'expediente.record': 90,
        'red.strictest': 140,
        'red.pairs': 60,
      },
    }
  },

  async sendUsage() {
    await delay(50)
  },

  async getStats(query) {
    await delay()

    const today = new Date().toISOString().slice(0, 10)
    // Una tarde cualquiera: sube hacia las seis y cae por la noche.
    const hours = Array.from({ length: 14 }, (_, index) => {
      const weight = 14 - Math.abs(index - 8)

      return {
        day: today,
        hour: 7 + index,
        people: query.login === undefined ? 2 + (weight % 5) : 1,
        clicks: weight * 6,
        seen: weight * 310,
        back: weight * 120,
        hidden: weight * 540,
        requests: weight * 45,
        bytes: weight * 310_000,
      }
    })
    const sum = (field: 'clicks' | 'seen' | 'back' | 'hidden' | 'requests' | 'bytes'): number =>
      hours.reduce((total, hour) => total + hour[field], 0)
    const totals = {
      clicks: sum('clicks'),
      seen: sum('seen'),
      back: sum('back'),
      hidden: sum('hidden'),
      requests: sum('requests'),
      bytes: sum('bytes'),
    }
    const share = (part: number) => ({
      clicks: Math.round(totals.clicks * part),
      seen: Math.round(totals.seen * part),
      back: Math.round(totals.back * part),
      hidden: Math.round(totals.hidden * part),
    })

    return {
      from: query.from ?? today,
      to: query.to ?? today,
      login: query.login ?? null,
      totals: { ...totals, people: query.login === undefined ? 4 : 1 },
      hours,
      keys: [
        { key: 'nav.consulta', ...share(0.4), people: 4 },
        { key: 'nav.tablon', ...share(0.3), people: 3 },
        { key: 'nav.red', ...share(0.2), people: 2 },
        { key: 'nav.clusters', ...share(0.1), people: 2 },
        { key: 'expediente.health', clicks: 9, seen: 0, back: 0, hidden: 0, people: 3 },
      ],
      users:
        query.login === undefined
          ? ['jdoe', 'rsoto', 'mlopez', ME.login].map((login, index) => ({
              login,
              ...share([0.4, 0.3, 0.2, 0.1][index] ?? 0),
              requests: Math.round(totals.requests * ([0.4, 0.3, 0.2, 0.1][index] ?? 0)),
              bytes: Math.round(totals.bytes * ([0.4, 0.3, 0.2, 0.1][index] ?? 0)),
            }))
          : [],
    }
  },

  async getUsageHeatmap(by) {
    await delay(200)

    const groups =
      by === 'total'
        ? [{ id: 'all', people: 64 }]
        : by === 'activity'
          ? [
              { id: 'casual', people: 38 },
              { id: 'regular', people: 20 },
              { id: 'heavy', people: 6 },
            ]
          : by === 'track'
            ? [
                { id: 'classic', people: 25 },
                { id: 'next', people: 31 },
                { id: 'unknown', people: 8 },
              ]
            : [
                { id: '2024', people: 14 },
                { id: '2025', people: 22 },
                { id: '2026', people: 28 },
              ]
    const keys = [
      'nav.consulta',
      'nav.tablon',
      'nav.red',
      'nav.calendario',
      'nav.terapia',
      'nav.pizarras',
      'nav.guardia',
      'expediente.health',
      'expediente.network',
      'expediente.record',
      'red.strictest',
      'red.endogamy',
      'guardia.today',
    ]

    return {
      by,
      groups,
      rows: keys.map((key, row) => ({
        key,
        // Cada grupo con sus manías, siempre las mismas.
        counts: groups.map((group, column) =>
          Math.round((group.people * (30 + ((row * 37 + column * 53) % 90))) / (1 + (row % 4))),
        ),
      })),
    }
  },

  async getAdminData() {
    await delay()

    return { kinds: Object.entries(dataRows).map(([id, rows]) => ({ id, rows })) }
  },

  async countAdminData(scope) {
    await delay(100)

    return { rows: rowsIn(scope) }
  },

  async deleteAdminData(scope) {
    await delay(200)

    const rows = rowsIn(scope)

    dataRows[scope.kind] = (dataRows[scope.kind] ?? 0) - rows

    return { rows }
  },
}

/** Filas de cada tipo de dato en la web de mentira. */
const dataRows: Record<string, number> = {
  traffic: 5210,
  tickets: 14,
  notices: 860,
  messages: 2340,
  event_alerts: 96,
  broadcasts: 7,
  checkins: 412,
  usage: 18_300,
  clicker_capital: 9100,
  clicker_alerts: 1,
  clicker_cheats: 0,
}

/** Aquí no hay fechas de verdad: una persona es la décima parte, y un tramo, la mitad. */
function rowsIn(scope: DataWipe): number {
  const all = dataRows[scope.kind] ?? 0
  const mine = scope.login === undefined ? all : Math.ceil(all / 10)

  return scope.before === undefined && scope.from === undefined ? mine : Math.ceil(mine / 2)
}
