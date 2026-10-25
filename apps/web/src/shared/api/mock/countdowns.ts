/**
 * Mantenimiento y avisos con cuenta atrás en la API simulada
 * (`docs/mantenimiento.md`, `docs/avisos-cuenta-atras.md`).
 *
 * - Hay un aviso de limpieza de taquillas esperando, para que se vea la
 *   ventanita (también en la demostración pública).
 * - Con `?mantenimiento` en la dirección, la web está en mantenimiento y quien
 *   mira no administra: sale la pantalla de mantenimiento, con su cuenta atrás.
 *   Sin él, quien mira administra y lo pone y lo quita desde el panel.
 */

import type {
  Countdown,
  CountdownNoticeReport,
  Maintenance,
  MaintenanceStatus,
} from '@sanatorio/contracts'

import type { Api } from '../types'
import { calendarEvents } from './calendar'
import { ME } from './data'
import { delay, fail, state } from './state'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const GRACE_MS = 30 * 60_000
const MAX_PINS = 12

/** El próximo viernes (o el de la semana que viene si ya es viernes) a las 9:00. */
function nextFriday(): string {
  const at = new Date()

  at.setDate(at.getDate() + ((5 - at.getDay() + 7) % 7 || 7))
  at.setHours(9, 0, 0, 0)

  return at.toISOString()
}

const visitor = new URLSearchParams(window.location.search).has('mantenimiento')

let maintenance: Maintenance = visitor
  ? {
      on: true,
      message: 'Migramos la base de datos a la versión 73. Tus commits están a salvo.',
      until: new Date(Date.now() + 2 * HOUR + 17 * 60_000).toISOString(),
      since: new Date(Date.now() - 20 * 60_000).toISOString(),
    }
  : { on: false, message: null, until: null, since: null }

let notices: CountdownNoticeReport[] = [
  {
    id: 1,
    kind: 'notice',
    title: null,
    body: null,
    preset: 'lockers',
    at: nextFriday(),
    eventId: null,
    from: 'albrodri',
    group: 'all',
    campusId: null,
    dismissed: 3,
    createdAt: new Date(Date.now() - DAY).toISOString(),
  },
]
const dismissed = new Set<number>()
let pins: Countdown[] = []
let nextId = 100

const PIN = { body: null, preset: null, from: null } as const

/** Un texto opcional como lo guarda la API: sin espacios de más, y vacío es `null`. */
const optional = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? ''

  return trimmed === '' ? null : trimmed
}

/** Lo tuyo: los avisos sin cerrar y lo fijado, con el próximo compromiso buscado. */
function mine(): Countdown[] {
  const now = Date.now()
  const alive = (at: string | null): boolean => at === null || Date.parse(at) > now - GRACE_MS
  const upcoming = calendarEvents(state)
    .filter(
      (event) =>
        Date.parse(event.start) > now &&
        event.joined !== false &&
        event.kind !== 'event_open' &&
        !event.id.startsWith('help:window:'),
    )
    .sort((a, b) => a.start.localeCompare(b.start))[0]
  const list: Countdown[] = [
    ...notices
      .filter((notice) => !dismissed.has(notice.id) && alive(notice.at))
      .map(({ group: _g, campusId: _c, dismissed: _d, createdAt: _a, ...notice }) => notice),
    ...pins
      .filter((pin) => alive(pin.at))
      .map((pin) =>
        pin.kind === 'next'
          ? {
              ...pin,
              title: upcoming?.title ?? null,
              at: upcoming?.start ?? null,
              eventId: upcoming?.id ?? null,
            }
          : pin,
      ),
  ]

  return list.sort((a, b) => (a.at ?? '9999').localeCompare(b.at ?? '9999'))
}

export const countdownsMock: Pick<
  Api,
  | 'getMaintenance'
  | 'setMaintenance'
  | 'getCountdowns'
  | 'pinCountdown'
  | 'unpinCountdown'
  | 'dismissCountdown'
  | 'getAdminCountdowns'
  | 'sendCountdown'
  | 'removeCountdown'
> = {
  async getMaintenance(): Promise<MaintenanceStatus> {
    await delay(40)

    return { ...maintenance, exempt: !visitor }
  },
  async setMaintenance(input) {
    await delay(80)

    const until = input.until ?? null

    if (input.on && until !== null && Date.parse(until) <= Date.now()) {
      throw fail(400, 'La hora de acabar ya ha pasado')
    }
    maintenance = input.on
      ? {
          on: true,
          message: optional(input.message),
          until,
          since: maintenance.since ?? new Date().toISOString(),
        }
      : { on: false, message: null, until: null, since: null }

    return { ...maintenance }
  },
  async getCountdowns() {
    await delay(60)

    return mine()
  },
  async pinCountdown(input) {
    await delay(80)

    const live = pins.filter((pin) => pin.at === null || Date.parse(pin.at) > Date.now())

    if (input.kind === 'next' && live.some((pin) => pin.kind === 'next')) return mine()
    if (input.kind === 'event' && live.some((pin) => pin.eventId === input.eventId)) return mine()
    if (live.length >= MAX_PINS) throw fail(409, `Como mucho, ${MAX_PINS} cuentas atrás a la vez`)

    if (input.kind === 'next') {
      pins.push({ ...PIN, id: nextId++, kind: 'next', title: null, at: null, eventId: null })
    } else if (input.kind === 'event') {
      const event = calendarEvents(state).find((each) => each.id === input.eventId)

      if (event === undefined) throw fail(404, 'Ese evento no está en tu calendario')
      if (Date.parse(event.start) <= Date.now()) throw fail(400, 'Esa hora ya ha pasado')
      pins.push({
        ...PIN,
        id: nextId++,
        kind: 'event',
        title: event.title,
        at: event.start,
        eventId: event.id,
      })
    } else {
      if (input.title.trim() === '') throw fail(400, 'title: no puede estar vacío')
      if (!(Date.parse(input.at) > Date.now())) throw fail(400, 'Esa hora ya ha pasado')
      pins.push({
        ...PIN,
        id: nextId++,
        kind: 'custom',
        title: input.title.trim(),
        at: new Date(input.at).toISOString(),
        eventId: null,
      })
    }

    return mine()
  },
  async unpinCountdown(id) {
    await delay(60)
    pins = pins.filter((pin) => pin.id !== id)

    return mine()
  },
  async dismissCountdown(id) {
    await delay(60)
    if (!mine().some((entry) => entry.kind === 'notice' && entry.id === id)) {
      throw fail(404, 'Ese aviso no existe o ya lo has cerrado')
    }
    dismissed.add(id)
    notices = notices.map((notice) =>
      notice.id === id ? { ...notice, dismissed: notice.dismissed + 1 } : notice,
    )

    return mine()
  },
  async getAdminCountdowns() {
    await delay(60)

    return notices.map((notice) => ({ ...notice }))
  },
  async sendCountdown(input) {
    await delay(80)

    const title = optional(input.title)

    if ((input.preset ?? null) === null && title === null) {
      throw fail(400, 'title: hace falta un título')
    }
    if (!(Date.parse(input.at) > Date.now())) throw fail(400, 'Esa hora ya ha pasado')

    const sent: CountdownNoticeReport = {
      id: nextId++,
      kind: 'notice',
      title,
      body: optional(input.body),
      preset: input.preset ?? null,
      at: new Date(input.at).toISOString(),
      eventId: null,
      from: ME.login,
      group: input.group,
      campusId: input.campusId ?? null,
      dismissed: 0,
      createdAt: new Date().toISOString(),
    }

    notices = [sent, ...notices]

    return { ...sent }
  },
  async removeCountdown(id) {
    await delay(60)
    notices = notices.filter((notice) => notice.id !== id)
  },
}

/** Para el pulso: la huella de los avisos a la vista y si hay mantenimiento. */
export const countdownPulse = (): { countdowns: number; maintenance: boolean } => {
  const shown = mine().filter((entry) => entry.kind === 'notice')

  return {
    countdowns: shown.reduce((sum, entry) => sum + entry.id * 31, shown.length),
    maintenance: maintenance.on,
  }
}
