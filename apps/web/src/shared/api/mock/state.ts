/**
 * El estado de la API de mentira y lo que comparten sus trozos: los datos en
 * memoria, las vistas que se calculan de ellos y un par de utilidades.
 */

import type {
  AchievementId,
  AdminPeople,
  BoardView,
  BudgetSettings,
  BudgetStatus,
  ClusterMap,
  DoubtView,
  Expediente,
  FortyTwoQuota,
  FortyTwoQuotaSettings,
  GroupView,
  Guide,
  HelpDay,
  MapSeat,
  MeetMessage,
  MeetPresence,
  Notice,
  Ticket,
} from '@sanatorio/contracts'
import { ApiError } from '../http'
import {
  BYSTANDERS,
  CLUSTER_SIZES,
  CORE,
  today,
  initialState,
  LEVEL_FLOORS,
  ME,
  PEERS,
  PROJECTS,
} from './data'
import { portrait } from './portrait'
import type { StoredBoard, StoredDoubt, StoredGroup } from './data'

export const LOGGED_KEY = 'mock_logged_in'
export const AVAILABLE_KEY = 'mock_available'
export const EMPTY_GUIDE: Guide = {
  start: [],
  problems: [],
  concepts: [],
  updatedBy: null,
  updatedAt: null,
}

export let state = initialState()
let nextId = 100

/** Latencia fingida, para que se vean los estados de carga. */
export const delay = (ms = 200): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

/** Error con la forma de los del cliente real, para que las pantallas lo traten igual. */
export const fail = (status: number, serverMessage: string): ApiError =>
  new ApiError(String(status), { status, serverMessage })

/** Un campo de texto opcional tal y como lo guarda la API: vacío es `null`. */
export const emptyToNull = (value: string | null | undefined): string | null =>
  value === undefined || value === null || value.trim() === '' ? null : value

export const projectName = (id: number): string =>
  CORE.flatMap((circle) => circle.projects).find((project) => project.id === id)?.name ??
  PROJECTS.find((project) => project.id === id)?.name ??
  `Proyecto ${id}`

export const isSpecialist = (projectId: number): boolean =>
  PROJECTS.some((project) => project.id === projectId && project.status === 'finished')

export function isLoggedIn(): boolean {
  const stored = localStorage.getItem(LOGGED_KEY)

  return stored === null ? import.meta.env.VITE_MOCK_LOGGED_IN === 'true' : stored === 'true'
}

export function find<T extends { id: number }>(list: readonly T[], id: number, what: string): T {
  const item = list.find((entry) => entry.id === id)

  if (item === undefined) {
    throw fail(404, `${what} no existe`)
  }

  return item
}

export function levelFor(xp: number): Expediente['xp'] {
  let index = 0

  LEVEL_FLOORS.forEach((floor, candidate) => {
    if (xp >= floor) index = candidate
  })

  return {
    total: xp,
    level: index + 1,
    floor: LEVEL_FLOORS[index] ?? 0,
    next: LEVEL_FLOORS[index + 1] ?? null,
  }
}

export function groupView(group: StoredGroup): GroupView {
  return {
    ...group,
    members: group.members.map((login) => ({
      login,
      image: null,
      progress: group.progress[login] ?? null,
    })),
    joined: group.members.includes(ME.login),
    mine: group.creator === ME.login,
    // Reunido si hoy es uno de sus días (aquí no se mira la hora).
    inSession: group.dates.includes(today()),
  }
}

export function doubtView(doubt: StoredDoubt): DoubtView {
  const bySpecialist = doubt.replies.some((reply) => reply.specialist)

  return {
    id: doubt.id,
    author: doubt.author,
    body: doubt.body,
    color: doubt.color,
    createdAt: doubt.createdAt,
    status: doubt.resolved ? 'resolved' : bySpecialist ? 'specialist' : 'open',
    answers: doubt.replies.length,
    mine: doubt.author === ME.login,
  }
}

export function boardView(board: StoredBoard): BoardView {
  return {
    ...board,
    attendees: board.attendees.length,
    joined: board.attendees.includes(ME.login),
    mine: board.host === ME.login,
  }
}

/** Proyectos en curso de alguien, según las listas de mentira. */
export function projectsOf(login: string): string[] {
  return PROJECTS.filter((project) =>
    (PEERS[project.id] ?? []).some((peer) => peer.login === login && peer.status === 'in_progress'),
  ).map((project) => project.name)
}

/** El plano de mentira: todos los puestos de `CLUSTER_SIZES`, con quien toque sentado. */
export function buildMap(projectId?: number): ClusterMap {
  const peers = projectId === undefined ? [] : (PEERS[projectId] ?? [])
  const seated = new Map<string, NonNullable<MapSeat['occupant']>>()

  for (const { login, host } of BYSTANDERS) {
    seated.set(host, {
      login,
      image: portrait(login),
      projects: projectsOf(login),
      duty: null,
      me: login === ME.login,
      // Uno de cada tres tiene la web abierta: basta para ver el punto.
      online: login.length % 3 === 0,
    })
  }

  for (const peer of peers) {
    if (peer.location !== null) {
      seated.set(peer.location, {
        login: peer.login,
        image: portrait(peer.login),
        projects: projectsOf(peer.login),
        duty: peer.available ? (peer.status === 'finished' ? 'specialist' : 'patient') : null,
        me: false,
        online: peer.available,
      })
    }
  }

  return {
    clusters: Object.entries(CLUSTER_SIZES).map(([id, [rows, seatsPerRow]]) => {
      const seats: MapSeat[] = []

      for (let row = 1; row <= rows; row += 1) {
        for (let seat = 1; seat <= seatsPerRow; seat += 1) {
          const host = `${id}r${row}s${seat}`
          const group = state.groups.find((candidate) => candidate.seats.includes(host))

          seats.push({
            host,
            row,
            seat,
            occupant: seated.get(host) ?? null,
            reservation:
              group === undefined
                ? null
                : {
                    groupId: group.id,
                    projectName: group.projectName,
                    dates: group.dates,
                    start: group.start,
                    end: group.end,
                    inSession: group.dates.includes(today()),
                  },
          })
        }
      }

      return {
        id,
        rows,
        seatsPerRow,
        seats,
        occupied: seats.filter((seat) => seat.occupant !== null).length,
        onDuty: seats.filter((seat) => seat.occupant !== null && seat.occupant.duty !== null)
          .length,
      }
    }),
    unplaced: [],
  }
}

/**
 * Una corrección de mentira para hoy, hora y media después de ahora, para que se
 * vea cómo bloquea la guardia. Si ya es muy tarde, ninguna.
 */
export function busyToday(): { start: string; end: string }[] {
  const date = new Date()
  const start = Math.ceil((date.getHours() * 60 + date.getMinutes()) / 30) * 30 + 90
  const time = (minutes: number): string =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

  return start + 30 <= 24 * 60 ? [{ start: time(start), end: time(start + 30) }] : []
}

/** Tu guardia de hoy, a partir de lo que hay en memoria. */
export function helpDay(): HelpDay {
  const date = new Date()
  const { windows, maxMinutes, bookings, blocked } = state.help
  const live = bookings.filter((booking) => booking.status !== 'cancelled')

  return {
    day: today(),
    now: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
    windows,
    maxMinutes,
    busy: busyToday(),
    bookedMinutes: live
      .filter(
        (booking) =>
          booking.role === 'helper' &&
          !booking.finished &&
          (booking.status === 'pending' || booking.status === 'confirmed'),
      )
      .reduce((sum) => sum + 30, 0),
    bookings: live.map((booking) => ({ ...booking })),
    // Como la API: el interruptor de la cabecera, y sentado en un puesto de mentira.
    presence: { available: localStorage.getItem(AVAILABLE_KEY) === 'true', seat: 'c2r4s6' },
    mustRate: live.some(
      (booking) =>
        booking.status === 'confirmed' &&
        booking.finished &&
        !booking.ratedByMe &&
        booking.xp === null,
    ),
    blocked: [...blocked],
  }
}

/** Un logro con su avance, ya recortado a la meta. */
export const achievement = (id: AchievementId, progress: number, goal: number) => ({
  id,
  goal,
  progress: Math.min(progress, goal),
  unlocked: progress >= goal,
})

/** Chats y asistencias de los eventos, mientras dure la pestaña. */
export const threads = new Map<string, MeetMessage[]>()
export const presences = new Map<string, MeetPresence>()

/** Lo del panel de gestión, mientras dure la pestaña. */
export const tickets: Ticket[] = [
  {
    id: 1,
    login: 'jdoe',
    kind: 'report',
    subject: 'Mensaje fuera de lugar en el chat de la pizarra',
    body: 'Insultos a otra persona en el chat.',
    target: 'message:3',
    category: null,
    section: 'pizarras',
    reason: 'insults',
    status: 'open',
    answer: null,
    answeredBy: null,
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    answeredAt: null,
    withdrawUntil: null,
  },
  {
    id: 2,
    login: 'mgarcia',
    kind: 'idea',
    subject: 'Un modo para daltónicos',
    body: 'Los porcentajes en verde y rojo no los distingo.',
    target: null,
    category: 'improvement',
    section: 'red',
    reason: null,
    status: 'answered',
    answer: 'Gracias: lo analizamos y el fin de semana lo implementamos.',
    answeredBy: 'plopez-l',
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    answeredAt: new Date(Date.now() - 80_000_000).toISOString(),
    withdrawUntil: null,
  },
]
export const admins: string[] = []
export const blocks: AdminPeople['blocks'] = []
export const limits = new Map<string, number>()

export const quotaSettings: FortyTwoQuotaSettings = {
  dailyRequests: null,
  monthlyRequests: null,
  renewDay: 1,
  saving: false,
}
/** Turnos que quedan delante en la cola de mentira. En un objeto para poder cambiarlo desde fuera. */
export const quotaQueue = { ahead: 5 }

export function quotaStatus(): FortyTwoQuota {
  return {
    settings: { ...quotaSettings },
    level: quotaSettings.saving ? 'tight' : 'ok',
    hourlyRemaining: 874,
    day: { spent: 3120, allowance: quotaSettings.dailyRequests },
    month: { spent: 41_800, daysLeft: 21, renewsOn: '2026-11-01' },
    queued: quotaSettings.saving ? quotaQueue.ahead + 1 : 0,
  }
}

/** Los ajustes del presupuesto en la web de mentira, y unas cuentas que se parecen a las de verdad. */
export const budgetSettings: BudgetSettings = {
  dailyRequests: 720_000,
  monthlyBytes: 10_000_000_000_000,
  renewDay: 1,
  share: 0.9,
  minPerPerson: 240,
  maxPerPerson: 3000,
  saving: false,
}

export function budgetStatus(): BudgetStatus {
  const allowance = Math.floor(
    budgetSettings.dailyRequests * budgetSettings.share * (budgetSettings.saving ? 0.25 : 1),
  )
  const used = 96_400

  return {
    settings: { ...budgetSettings },
    level: 'ok',
    day: {
      allowance,
      used,
      left: Math.max(0, allowance - used),
      forecast: 171_000,
      limitedBy: 'day',
    },
    month: {
      bytesUsed: 38_000_000_000,
      stopAt: budgetSettings.monthlyBytes === null ? null : budgetSettings.monthlyBytes * 0.9,
      hardStopAt: budgetSettings.monthlyBytes === null ? null : budgetSettings.monthlyBytes * 0.95,
      bytesLeft:
        budgetSettings.monthlyBytes === null
          ? null
          : budgetSettings.monthlyBytes * 0.9 - 38_000_000_000,
      daysLeft: 21,
      renewsOn: '2026-11-01',
    },
  }
}

/** Un id nuevo para lo que se crea en la web de mentira. */
export function newId(): number {
  nextId += 1

  return nextId - 1
}

/** Vuelve al estado de recién abierta, como al cerrar sesión. */
export function resetState(): void {
  state = initialState()
}

/** El buzón de avisos de la web de mentira: un par de cosas sin leer para que se vea el número. */
export const notices: Notice[] = [
  {
    id: 3,
    kind: 'chat',
    ref: 'board:1',
    from: 'jdoe',
    text: '¿Hace falta traer algo?',
    count: 2,
    at: new Date(Date.now() - 4 * 60_000).toISOString(),
    read: false,
    saved: false,
  },
  {
    id: 2,
    kind: 'booking_requested',
    ref: 'help:booking:1',
    from: 'mgarcia',
    text: '17:00–17:30 · ft_printf',
    count: 1,
    at: new Date(Date.now() - 50 * 60_000).toISOString(),
    read: false,
    saved: false,
  },
  {
    id: 1,
    kind: 'doubt_solved',
    ref: 'doubt:1',
    from: 'lruiz',
    text: '¿Cómo pruebo ft_printf sin tester?',
    count: 1,
    at: new Date(Date.now() - 26 * 3_600_000).toISOString(),
    read: true,
    saved: true,
  },
]

/** Deja un aviso nuevo, sin leer, arriba del buzón de mentira. */
export function addNotice(notice: Pick<Notice, 'kind' | 'ref' | 'from' | 'text'>): void {
  notices.unshift({
    ...notice,
    id: newId(),
    count: 1,
    at: new Date().toISOString(),
    read: false,
    saved: false,
  })
}
