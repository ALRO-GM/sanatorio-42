/**
 * API de mentira: el Pomodoro de quien mira y sus estadísticas (#80 del buzón).
 *
 * Para que las gráficas tengan algo que enseñar, al cargar se inventan unos
 * meses de sesiones de una cuarentena de logins de mentira, y de quien mira.
 * Las cuentas son las justas para la demostración (cada sesión cuenta entera
 * en la hora en que empezó); las de verdad son de la API.
 */

import type {
  Focus,
  FocusFigures,
  FocusReason,
  FocusSettings,
  FocusStats,
} from '@sanatorio/contracts'

import { delay } from './state'
import type { Api, FocusStatsQuery } from '../types'

const DEFAULTS: FocusSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  sections: ['calendario', 'expediente'],
  show: ['corrections', 'events'],
}

const REASONS: FocusReason[] = [
  'tired',
  'break',
  'distracted',
  'someone',
  'urgent',
  'done',
  'other',
]
const ME = 'yo'
const DAY_MS = 86_400_000

type Logged = {
  login: string
  at: number
  seconds: number
  end: 'completed' | 'cancelled' | 'running'
  reasons: FocusReason[]
  stayed: FocusReason[][]
}

/** Siempre los mismos números: la demostración no cambia de una visita a otra. */
function seeded(seed: number): () => number {
  let value = seed

  return () => {
    value = (value * 16_807) % 2_147_483_647

    return value / 2_147_483_647
  }
}

function invent(): Logged[] {
  const random = seeded(42)
  const pick = (): FocusReason => REASONS[Math.floor(random() * REASONS.length)] ?? 'other'
  const people = [ME, ...Array.from({ length: 40 }, (_, at) => `peer${at + 1}`)]
  const out: Logged[] = []
  const today = Date.now() - (Date.now() % DAY_MS)

  people.forEach((login, rank) => {
    // Unos lo usan casi a diario y otros de higos a brevas.
    const keen = login === ME ? 0.55 : 0.08 + (rank / people.length) * 0.7

    for (let day = 120; day >= 1; day--) {
      if (random() > keen) continue

      const hour = 8 + Math.floor(random() * 13)
      const planned = [25, 25, 50, 90][Math.floor(random() * 4)] ?? 25
      const cancelled = random() < 0.22
      const stayed = random() < 0.25 ? [[pick()]] : []

      out.push({
        login,
        at: today - day * DAY_MS + hour * 3_600_000 + Math.floor(random() * 50) * 60_000,
        seconds: (cancelled ? Math.floor(planned * random()) : planned) * 60,
        end: cancelled ? 'cancelled' : 'completed',
        reasons: cancelled ? [pick()] : [],
        stayed,
      })
    }
  })

  return out
}

const log: Logged[] = invent()

let state: Focus = { until: null, startedAt: null, settings: DEFAULTS }

/** La sesión de quien mira que está en marcha, si la hay. */
const current = (): Logged | undefined =>
  log.findLast((one) => one.login === ME && one.end === 'running')

function finish(end: Logged['end'], reasons: FocusReason[]): void {
  const open = current()

  if (open === undefined) return

  open.end = end
  open.reasons = reasons
  open.seconds = Math.round((Date.now() - open.at) / 1000)
}

const blank = (): FocusFigures => ({
  sessions: 0,
  completed: 0,
  cancelled: 0,
  stayed: 0,
  focusedSeconds: 0,
})

function add(into: FocusFigures, one: Logged): void {
  into.sessions += 1
  into.completed += one.end === 'completed' ? 1 : 0
  into.cancelled += one.end === 'cancelled' ? 1 : 0
  into.stayed += one.stayed.length
  into.focusedSeconds +=
    one.end === 'running' ? Math.round((Date.now() - one.at) / 1000) : one.seconds
}

/** Lo de un periodo, con el tramo de quienes lo usan por tiempo concentrado. */
function compute(query: FocusStatsQuery, only?: string) {
  const shift = query.offset * 60_000
  const local = (at: number): string => new Date(at + shift).toISOString().slice(0, 10)
  const inside = log.filter(
    (one) => local(one.at) <= query.to && (query.from === undefined || local(one.at) >= query.from),
  )
  const time = new Map<string, number>()

  for (const one of inside) time.set(one.login, (time.get(one.login) ?? 0) + one.seconds)

  const ranked = [...time.entries()].sort((a, b) => a[1] - b[1]).map(([login]) => login)
  const low = query.low ?? 0
  const high = query.high ?? 100
  const band = new Set(
    ranked.slice(Math.floor((ranked.length * low) / 100), Math.ceil((ranked.length * high) / 100)),
  )
  const rows = inside.filter((one) =>
    only === undefined ? band.has(one.login) : one.login === only,
  )
  const totals = blank()
  const days = new Map<string, FocusFigures>()
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, sessions: 0, focusedSeconds: 0 }))
  const reasons = REASONS.map((reason) => ({ reason, cancelled: 0, stayed: 0 }))

  for (const one of rows) {
    add(totals, one)
    const day = days.get(local(one.at)) ?? blank()

    add(day, one)
    days.set(local(one.at), day)
    const hour = hours[new Date(one.at + shift).getUTCHours()]

    if (hour !== undefined) {
      hour.sessions += 1
      hour.focusedSeconds += one.seconds
    }
    for (const row of reasons) {
      if (one.end === 'cancelled' && one.reasons.includes(row.reason)) row.cancelled += 1
      row.stayed += one.stayed.filter((list) => list.includes(row.reason)).length
    }
  }

  const stats: FocusStats = {
    from: query.from ?? null,
    to: query.to,
    totals: { ...totals, people: new Set(rows.map((one) => one.login)).size },
    days: [...days.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([day, figures]) => ({ ...figures, day })),
    hours,
    reasons,
    segment: { low, high, people: band.size, of: time.size },
  }

  return { stats, band, ranked }
}

export const focusMock: Pick<
  Api,
  'getFocus' | 'startFocus' | 'stopFocus' | 'stayFocus' | 'getMyFocusStats' | 'getAdminFocusStats'
> = {
  async getFocus() {
    await delay(60)

    if (state.until !== null && Date.parse(state.until) <= Date.now()) {
      finish('completed', [])
      state = { ...state, until: null, startedAt: null }
    }

    return { ...state }
  },
  async startFocus(settings) {
    await delay(100)

    const now = Date.now()

    finish('completed', [])
    log.push({
      login: ME,
      at: now,
      seconds: settings.focusMinutes * 60,
      end: 'running',
      reasons: [],
      stayed: [],
    })
    state = {
      settings,
      startedAt: new Date(now).toISOString(),
      until: new Date(now + settings.focusMinutes * 60_000).toISOString(),
    }

    return { ...state }
  },
  async stopFocus(reasons = []) {
    await delay(80)
    finish('cancelled', reasons)
    state = { ...state, until: null, startedAt: null }

    return { ...state }
  },
  async stayFocus(reasons) {
    await delay(80)
    current()?.stayed.push(reasons)

    return { ...state }
  },
  async getMyFocusStats(query) {
    await delay(150)

    const everyone = compute(query)
    const mine = compute(query, ME).stats
    const people = Math.max(1, everyone.band.size)
    const mean = (value: number): number => Math.round((value / people) * 10) / 10
    const place = everyone.ranked.indexOf(ME)

    return {
      ...mine,
      segment: everyone.stats.segment,
      band: {
        sessions: mean(everyone.stats.totals.sessions),
        completed: mean(everyone.stats.totals.completed),
        cancelled: mean(everyone.stats.totals.cancelled),
        stayed: mean(everyone.stats.totals.stayed),
        focusedSeconds: Math.round(everyone.stats.totals.focusedSeconds / people),
      },
      position:
        place < 0 || everyone.ranked.length < 2
          ? null
          : Math.round((place / (everyone.ranked.length - 1)) * 100),
    }
  },
  async getAdminFocusStats(query) {
    await delay(150)

    return compute(query).stats
  },
}
