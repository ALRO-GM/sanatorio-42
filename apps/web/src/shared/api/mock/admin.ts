/**
 * API de mentira: buzón, panel de gestión, presupuesto y uso.
 */

import type { DataWipe, Ticket } from '@sanatorio/contracts'
import { ME } from './data'
import { portrait } from './portrait'
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

/** La versión de mentira de la privacidad y las condiciones, y si se ha aceptado. */
const legal: { version: string; acceptedAt: string | null } = {
  version: '2026-10-23',
  acceptedAt: null,
}

/** El panel de mentira: dado de alta o no, y hasta cuándo está abierto. */
const panel: { enrolled: boolean; elevatedUntil: string | null } = {
  enrolled: false,
  elevatedUntil: null,
}

function openPanel(code: string): void {
  if (!/^\d{6}$/.test(code) || code === '000000')
    throw fail(400, 'Ese código no vale (o ya se usó)')

  panel.elevatedUntil = new Date(Date.now() + 12 * 3_600_000).toISOString()
}

/** Los clics que manda la web de mentira, para el mapa de calor. */
const clickCells = new Map<string, number>()
const clickElements = new Map<string, number>()

export const adminMock: Pick<
  Api,
  | 'openTicket'
  | 'getMyTickets'
  | 'getAdminTickets'
  | 'answerTicket'
  | 'getNotices'
  | 'readNotices'
  | 'removeNotices'
  | 'saveNotice'
  | 'withdrawTicket'
  | 'removeTicket'
  | 'getLegal'
  | 'acceptLegal'
  | 'exportUrl'
  | 'anonymizeMe'
  | 'getSecondFactor'
  | 'setupSecondFactor'
  | 'confirmSecondFactor'
  | 'verifySecondFactor'
  | 'lockPanel'
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
  | 'sendClicks'
  | 'getClickHeatmap'
  | 'getStats'
  | 'getAdminGrowth'
  | 'getUsageHeatmap'
  | 'getFlows'
  | 'getTourSpeeds'
  | 'sendTourSpeed'
  | 'getTourStats'
  | 'searchPeople'
  | 'getOnline'
  | 'getAdminData'
  | 'previewAdminData'
  | 'deleteAdminData'
> = {
  async openTicket(ticket) {
    await delay(150)

    const created: Ticket = {
      id: tickets.length + 1,
      login: ME.login,
      kind: ticket.kind,
      // Como la API: sin título, la primera línea del mensaje.
      subject: ticket.subject ?? ticket.body.trim().split('\n')[0]?.slice(0, 80) ?? '',
      body: ticket.body,
      target: ticket.target ?? null,
      category: ticket.category ?? null,
      section: ticket.section ?? null,
      reason: ticket.reason ?? null,
      status: 'open',
      answer: null,
      answeredBy: null,
      createdAt: new Date().toISOString(),
      answeredAt: null,
      withdrawUntil: new Date(Date.now() + 15 * 60_000).toISOString(),
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

  async removeNotices(which) {
    await delay(100)

    for (let index = notices.length - 1; index >= 0; index -= 1) {
      const notice = notices[index]

      if (notice === undefined) continue
      if ('ids' in which ? which.ids.includes(notice.id) : notice.read && !notice.saved) {
        notices.splice(index, 1)
      }
    }

    return this.getNotices()
  },

  async saveNotice(id, saved) {
    await delay(100)

    const notice = notices.find((entry) => entry.id === id)

    if (notice !== undefined) notice.saved = saved

    return this.getNotices()
  },

  async withdrawTicket(id) {
    await delay(100)

    const index = tickets.findIndex(
      (ticket) =>
        ticket.id === id &&
        ticket.login === ME.login &&
        ticket.withdrawUntil !== null &&
        Date.parse(ticket.withdrawUntil) > Date.now(),
    )

    if (index === -1) throw fail(409, 'Ya no se puede retirar')

    tickets.splice(index, 1)
  },

  async getLegal() {
    await delay(60)

    return { ...legal }
  },

  async acceptLegal(version) {
    await delay(100)
    if (version !== legal.version) throw fail(409, 'El texto ha cambiado: léelo otra vez')
    legal.acceptedAt ??= new Date().toISOString()

    return { ...legal }
  },

  // La descarga de mentira: un JSON hecho aquí mismo, con datos inventados.
  exportUrl() {
    const data = {
      login: ME.login,
      exportedAt: new Date().toISOString(),
      legalVersion: legal.version,
      tables: { tickets: tickets.filter((ticket) => ticket.login === ME.login), notices },
    }

    return URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    )
  },

  // En la web de mentira no se anonimiza nada: solo se comprueba el login.
  async anonymizeMe(confirm) {
    await delay(80)

    if (confirm.trim().toLowerCase() !== ME.login)
      throw fail(400, 'Escribe tu login para confirmarlo')

    return { changed: 0 }
  },

  // Segundo factor de mentira: cualquier código de seis cifras vale, menos 000000.
  async getSecondFactor() {
    await delay(80)

    return { ...panel, elevatedUntil: panel.elevatedUntil }
  },

  async setupSecondFactor() {
    await delay(80)

    return {
      uri: 'otpauth://totp/Sanatorio%2042%3Aplopez-l?secret=JBSWY3DPEHPK3PXP&issuer=Sanatorio%2042',
    }
  },

  async confirmSecondFactor(code) {
    await delay(120)
    openPanel(code)
    panel.enrolled = true
  },

  async verifySecondFactor(code) {
    await delay(120)
    openPanel(code)
  },

  async lockPanel() {
    await delay(60)
    panel.elevatedUntil = null
  },

  async removeTicket(id) {
    await delay(100)

    const index = tickets.findIndex((ticket) => ticket.id === id)

    if (index === -1) throw fail(404, 'Ese aviso no existe')

    tickets.splice(index, 1)
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
      withdrawUntil: null,
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

  async sendClicks(batch) {
    await delay(30)

    // Como la API: se suman por sección y forma de pantalla.
    for (const cell of batch.cells) {
      const key = `${batch.section}|${batch.layout}|${cell.x},${cell.y}`

      clickCells.set(key, (clickCells.get(key) ?? 0) + cell.n)
    }
    for (const one of batch.elements) {
      const key = `${batch.section}|${one.interactive ? 1 : 0}|${one.element}`

      clickElements.set(key, (clickElements.get(key) ?? 0) + one.n)
    }
  },

  async getClickHeatmap(section, layout, days) {
    await delay(150)

    const chosen = section ?? 'expediente'
    // De ejemplo: la foto del expediente y las cifras se pulsan sin hacer nada.
    const sample: [number, number, number][] = [
      [2, 3, 14],
      [3, 3, 18],
      [3, 4, 9],
      [12, 2, 6],
      [20, 1, 4],
      [6, 9, 11],
      [7, 9, 13],
      [14, 12, 5],
      [15, 12, 7],
      [4, 18, 3],
      [18, 20, 8],
    ]
    const cells = new Map(sample.map(([x, y, n]) => [`${x},${y}`, n]))

    for (const [key, n] of clickCells) {
      const [where = '', shape = '', cell = ''] = key.split('|')

      if (where === chosen && shape === layout) cells.set(cell, (cells.get(cell) ?? 0) + n)
    }

    const elements = new Map<string, number>([
      ['0|img.avatar', 41],
      ['1|button.pill', 33],
      ['0|div.stat-card', 19],
      ['1|a.record-link', 12],
      ['0|h2', 6],
    ])

    for (const [key, n] of clickElements) {
      const [where = '', interactive = '0', element = 'div'] = key.split('|')

      if (where === chosen)
        elements.set(
          `${interactive}|${element}`,
          (elements.get(`${interactive}|${element}`) ?? 0) + n,
        )
    }

    return {
      section: chosen,
      layout,
      days,
      columns: 24,
      rowPx: 40,
      cells: [...cells.entries()].map(([cell, n]) => {
        const [x = 0, y = 0] = cell.split(',').map(Number)

        return { x, y, n }
      }),
      elements: [...elements.entries()]
        .map(([key, n]) => {
          const [interactive = '0', element = 'div'] = key.split('|')

          return { element, interactive: interactive === '1', n }
        })
        .sort((a, b) => b.n - a.n),
      sections: ['expediente', 'consulta', 'tablon', 'clusters', 'notgames'],
    }
  },

  async getAdminGrowth(from, to, campuses) {
    await delay(200)

    // Tres campus de mentira, con gente que crece poco a poco.
    const all = [
      { id: 22, name: 'Madrid', people: 412 },
      { id: 46, name: 'Málaga', people: 128 },
      { id: 58, name: 'Barcelona', people: 96 },
    ]
    const selected = campuses.length === 0 ? all.map((campus) => campus.id) : [...campuses]
    const days = []

    for (let at = Date.parse(from), n = 0; at <= Date.parse(to); at += 86_400_000, n++) {
      const day = new Date(at).toISOString().slice(0, 10)
      const weekend = [0, 6].includes(new Date(at).getUTCDay())

      for (const [index, campus] of all.entries()) {
        if (!selected.includes(campus.id)) continue
        days.push({
          day,
          campusId: campus.id,
          active: Math.round(
            (campus.people / 6) * (weekend ? 0.4 : 1) * (1 + 0.3 * Math.sin(n / 3 + index)),
          ),
          newUsers: (n * 7 + index * 3) % 5,
        })
      }
    }

    return {
      from,
      to,
      campuses: all,
      selected,
      days,
      before: all
        .filter((campus) => selected.includes(campus.id))
        .map((campus) => ({ campusId: campus.id, people: campus.people - 40 })),
    }
  },

  async getStats(query) {
    await delay()

    const segment = segmentOf(query, query.login === undefined ? 4 : 1)

    const today = new Date().toISOString().slice(0, 10)
    // Una tarde cualquiera: sube hacia las seis y cae por la noche.
    const hours = Array.from({ length: 14 }, (_, index) => {
      // El tramo de gente se nota: con menos gente, menos de todo.
      const weight = Math.max(1, Math.round((14 - Math.abs(index - 8)) * segment.part))

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
      segment: segment.told,
      totals: { ...totals, people: segment.told.people },
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

  async getUsageHeatmap(by, query = {}) {
    await delay(200)

    const segment = segmentOf(query, 9)

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
      segment: segment.told,
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

  async getFlows(query) {
    await delay()

    const today = new Date().toISOString().slice(0, 10)
    const segment = segmentOf(query, query.login === undefined ? 9 : 1)
    const part = (query.login === undefined ? 1 : 0.25) * segment.part
    // Se entra por el expediente, que es la portada, y de ahí se reparte.
    const steps: [string, string, number][] = [
      ['start', 'expediente', 120],
      ['start', 'consulta', 34],
      ['start', 'tablon', 18],
      ['expediente', 'consulta', 70],
      ['expediente', 'tablon', 28],
      ['expediente', 'calendario', 12],
      ['consulta', 'clusters', 40],
      ['consulta', 'terapia', 22],
      ['consulta', 'expediente', 14],
      ['tablon', 'red', 16],
      ['tablon', 'expediente', 9],
      ['clusters', 'consulta', 12],
      ['terapia', 'pizarras', 10],
      ['red', 'tablon', 6],
      ['calendario', 'expediente', 5],
      ['pizarras', 'terapia', 3],
    ]
    const seen: Record<string, number> = {
      expediente: 2400,
      consulta: 14_000,
      tablon: 9800,
      clusters: 5200,
      terapia: 4100,
      red: 6900,
      calendario: 700,
      pizarras: 2600,
    }
    const flows = steps.map(([from, to, count]) => ({
      from,
      to,
      count: Math.ceil(count * part),
      people: Math.min(query.login === undefined ? 9 : 1, Math.ceil(count / 12)),
    }))
    const sections = Object.keys(seen)
      .map((key) => {
        const visits = flows.reduce((sum, flow) => sum + (flow.to === key ? flow.count : 0), 0)
        const entries = flows.find((flow) => flow.from === 'start' && flow.to === key)?.count ?? 0
        const onward = flows.reduce((sum, flow) => sum + (flow.from === key ? flow.count : 0), 0)
        const exits = Math.max(0, visits - onward)
        const time = Math.round((seen[key] ?? 0) * part)
        const avgSeen = visits === 0 ? 0 : Math.round(time / visits)
        const exitRate = visits === 0 ? 0 : exits / visits

        return {
          key,
          visits,
          entries,
          exits,
          onward,
          seen: time,
          avgSeen,
          exitRate,
          role:
            avgSeen < 20 && exitRate < 0.3
              ? ('pass' as const)
              : exitRate >= 0.6
                ? ('end' as const)
                : avgSeen >= 120
                  ? ('stay' as const)
                  : null,
        }
      })
      .sort((a, b) => b.visits - a.visits)

    return {
      from: query.from ?? today,
      to: query.to ?? today,
      login: query.login ?? null,
      segment: segment.told,
      sessions: flows.reduce((sum, flow) => sum + (flow.from === 'start' ? flow.count : 0), 0),
      sections,
      flows: flows.sort((a, b) => b.count - a.count),
    }
  },

  async getTourSpeeds() {
    await delay(80)

    return { speeds: { ...tourSpeeds } }
  },

  async sendTourSpeed(name, rate) {
    await delay(80)
    tourRates[name] = rate

    return { speed: tourSpeeds[name] ?? 1 }
  },

  async getTourStats() {
    await delay()

    // Lo que se ha visto en esta visita, más un par de ejemplos para que haya algo.
    const mine = Object.entries(tourRates).map(([name, rate]) => ({
      name,
      speed: tourSpeeds[name] ?? 1,
      faster: Number(rate > 1),
      slower: Number(rate < 1),
      same: Number(rate === 1),
      mean: rate,
      adjustedAt: null,
    }))

    return {
      votesToAdjust: 8,
      tours: [
        ...mine,
        {
          name: 'guardia',
          speed: 1.25,
          faster: 5,
          slower: 0,
          same: 1,
          mean: 1.38,
          adjustedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
        },
        { name: 'red', speed: 1, faster: 1, slower: 4, same: 2, mean: 0.82, adjustedAt: null },
      ].filter((tour, index, all) => all.findIndex((other) => other.name === tour.name) === index),
    }
  },

  async searchPeople(q) {
    await delay(120)

    const wanted = q.trim().toLowerCase()

    if (wanted.length < 2) return []

    return MOCK_PEOPLE.filter(
      (person) => person.login.includes(wanted) || person.name.toLowerCase().includes(wanted),
    )
      .sort((a, b) => Number(b.login.startsWith(wanted)) - Number(a.login.startsWith(wanted)))
      .slice(0, 8)
      .map((person) => ({ ...person, image: portrait(person.login) }))
  },

  async getOnline() {
    await delay(120)

    const ago = (minutes: number): string => new Date(Date.now() - minutes * 60_000).toISOString()

    return {
      now: new Date().toISOString(),
      people: [
        { login: 'jdoe', image: portrait('jdoe'), since: ago(134), seenAt: ago(0) },
        { login: ME.login, image: portrait(ME.login), since: ago(22), seenAt: ago(0) },
        { login: 'rsoto', image: portrait('rsoto'), since: ago(3), seenAt: ago(1) },
      ],
    }
  },

  async getAdminData() {
    await delay()

    return { kinds: Object.entries(dataRows).map(([id, rows]) => ({ id, rows })) }
  },

  async previewAdminData(scope) {
    await delay(150)

    const rows = rowsIn(scope)
    const who = scope.login ?? 'jdoe'
    // Unas pocas filas con pinta de mensajes: aquí no hay tablas de verdad.
    const sample = Array.from({ length: Math.min(rows, 8) }, (_, index) => [
      2340 - index,
      `board:${3 - (index % 3)}`,
      index % 2 === 0 ? who : 'rsoto',
      'text',
      ['¿Alguien por el cluster 2?', 'Llego en diez minutos', 'Gracias por la pizarra'][
        index % 3
      ] ?? null,
      new Date(Date.now() - index * 5_400_000).toISOString(),
    ])

    return {
      rows,
      columns: ['id', 'event_id', 'login', 'kind', 'body', 'created_at'],
      sample,
    }
  },

  async deleteAdminData(scope) {
    await delay(200)

    const rows = rowsIn(scope)

    dataRows[scope.kind] = (dataRows[scope.kind] ?? 0) - rows

    return { rows }
  },
}

/** La velocidad de fábrica de cada demostración y a cuánto se ha visto en esta visita. */
const tourSpeeds: Record<string, number> = { guardia: 1.25 }
const tourRates: Record<string, number> = {}

/** Gente a la que encontrar con el buscador de arriba. */
const MOCK_PEOPLE = [
  { login: 'jdoe', name: 'Jane Doe' },
  { login: 'rsoto', name: 'Rocío Soto' },
  { login: 'mlopez', name: 'Mario López' },
  { login: 'mgarcia', name: 'María García' },
  { login: 'agarcia', name: 'Ander García' },
  { login: 'ibanez', name: 'Irene Ibáñez' },
  { login: 'pmartin', name: 'Pau Martín' },
  { login: 'lmartinez', name: 'Laia Martínez' },
]

/** El tramo de gente que se pide, sobre `of` personas, y la parte que es del total. */
function segmentOf(
  query: { low?: number; high?: number },
  of: number,
): { told: { low: number; high: number; people: number; of: number }; part: number } {
  const [low, high] = [query.low ?? 0, query.high ?? 100]
  const people = Math.ceil((of * high) / 100) - Math.floor((of * low) / 100)

  return { told: { low, high, people, of }, part: of === 0 ? 0 : people / of }
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
