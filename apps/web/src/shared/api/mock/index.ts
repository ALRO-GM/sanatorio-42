/**
 * API de mentira, en memoria. Es lo que usa `npm run dev:mock`.
 *
 * Se puede crear, unirse y responder, y todo se pierde al recargar. Las reglas
 * de verdad (plazas, permisos, XP) viven en la API; aquí solo hay lo justo para
 * que cada pantalla se pueda probar sin servidor. Al cumplir el tipo `Api`, el
 * compilador avisa si se queda atrás respecto al contrato.
 */

import type {
  AchievementId,
  BoardView,
  Booking,
  HelpDay,
  ClusterMap,
  MapSeat,
  DoubtView,
  Expediente,
  GroupView,
  Guide,
} from '@sanatorio/contracts'

import { ApiError } from '../http'
import type { Api } from '../types'
import {
  BYSTANDERS,
  CAMPUSES,
  CLUSTER_SIZES,
  CORE,
  CURRENT_CIRCLE,
  offers,
  RANKING,
  today,
  initialState,
  LEVEL_FLOORS,
  ME,
  PEERS,
  PROJECTS,
  TITLES,
} from './data'
import { calendarEvents } from './calendar'
import { mockNetwork, mockPair, mockPeople } from './network'
import { portrait } from './portrait'
import type { StoredBoard, StoredDoubt, StoredGroup } from './data'

const LOGGED_KEY = 'mock_logged_in'
const AVAILABLE_KEY = 'mock_available'
const EMPTY_GUIDE: Guide = {
  start: [],
  problems: [],
  concepts: [],
  updatedBy: null,
  updatedAt: null,
}

let state = initialState()
let nextId = 100

/** Latencia fingida, para que se vean los estados de carga. */
const delay = (ms = 200): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

/** Error con la forma de los del cliente real, para que las pantallas lo traten igual. */
const fail = (status: number, serverMessage: string): ApiError =>
  new ApiError(String(status), { status, serverMessage })

/** Un campo de texto opcional tal y como lo guarda la API: vacío es `null`. */
const emptyToNull = (value: string | null | undefined): string | null =>
  value === undefined || value === null || value.trim() === '' ? null : value

const projectName = (id: number): string =>
  CORE.flatMap((circle) => circle.projects).find((project) => project.id === id)?.name ??
  PROJECTS.find((project) => project.id === id)?.name ??
  `Proyecto ${id}`

const isSpecialist = (projectId: number): boolean =>
  PROJECTS.some((project) => project.id === projectId && project.status === 'finished')

function isLoggedIn(): boolean {
  const stored = localStorage.getItem(LOGGED_KEY)

  return stored === null ? import.meta.env.VITE_MOCK_LOGGED_IN === 'true' : stored === 'true'
}

function find<T extends { id: number }>(list: readonly T[], id: number, what: string): T {
  const item = list.find((entry) => entry.id === id)

  if (item === undefined) {
    throw fail(404, `${what} no existe`)
  }

  return item
}

function levelFor(xp: number): Expediente['xp'] {
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

function groupView(group: StoredGroup): GroupView {
  return {
    ...group,
    members: group.members.map((login) => ({ login, image: null })),
    joined: group.members.includes(ME.login),
    mine: group.creator === ME.login,
    // Reunido si hoy es uno de sus días (aquí no se mira la hora).
    inSession: group.dates.includes(today()),
  }
}

function doubtView(doubt: StoredDoubt): DoubtView {
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

function boardView(board: StoredBoard): BoardView {
  return {
    ...board,
    attendees: board.attendees.length,
    joined: board.attendees.includes(ME.login),
    mine: board.host === ME.login,
  }
}

/** Proyectos en curso de alguien, según las listas de mentira. */
function projectsOf(login: string): string[] {
  return PROJECTS.filter((project) =>
    (PEERS[project.id] ?? []).some((peer) => peer.login === login && peer.status === 'in_progress'),
  ).map((project) => project.name)
}

/** El plano de mentira: todos los puestos de `CLUSTER_SIZES`, con quien toque sentado. */
function buildMap(projectId?: number): ClusterMap {
  const peers = projectId === undefined ? [] : (PEERS[projectId] ?? [])
  const seated = new Map<string, NonNullable<MapSeat['occupant']>>()

  for (const { login, host } of BYSTANDERS) {
    seated.set(host, {
      login,
      image: portrait(login),
      projects: projectsOf(login),
      duty: null,
      me: login === ME.login,
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
function busyToday(): { start: string; end: string }[] {
  const date = new Date()
  const start = Math.ceil((date.getHours() * 60 + date.getMinutes()) / 30) * 30 + 90
  const time = (minutes: number): string =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

  return start + 30 <= 24 * 60 ? [{ start: time(start), end: time(start + 30) }] : []
}

/** Tu guardia de hoy, a partir de lo que hay en memoria. */
function helpDay(): HelpDay {
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

export const mockApi: Api = {
  // --- Sesión ------------------------------------------------------------------

  async getMe() {
    await delay()

    if (!isLoggedIn()) {
      throw fail(401, 'No hay sesión iniciada')
    }

    return ME
  },

  login() {
    // En la API real esto redirige a 42; aquí basta con apuntar que se ha entrado.
    localStorage.setItem(LOGGED_KEY, 'true')

    return Promise.resolve()
  },

  async logout() {
    await delay()
    localStorage.removeItem(LOGGED_KEY)
    state = initialState()
  },

  // --- Consulta ----------------------------------------------------------------

  async getMyProjects(all = false) {
    await delay()

    return all
      ? PROJECTS
      : PROJECTS.filter((project) => project.status === 'in_progress').map(({ id, name }) => ({
          id,
          name,
        }))
  },

  async getPeers(projectId) {
    await delay()
    const peers = PEERS[projectId] ?? []

    return { peers, total: peers.length, partial: false }
  },

  async getAvailability() {
    await delay(50)

    return localStorage.getItem(AVAILABLE_KEY) === 'true'
  },

  async setAvailability(available) {
    await delay()
    localStorage.setItem(AVAILABLE_KEY, String(available))

    return { available }
  },

  // --- Calendario personal -----------------------------------------------------

  async getCalendar(from, to) {
    await delay()

    return {
      events: calendarEvents(state)
        .filter((event) => event.start < to && event.end > from)
        .sort((a, b) => a.start.localeCompare(b.start)),
      fortyTwoAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    }
  },

  // --- Mapa de clusters --------------------------------------------------------

  async getProjectMap(projectId) {
    await delay()

    return buildMap(projectId)
  },

  async getCampusMap() {
    await delay()

    return buildMap()
  },

  // --- Campus, preferencias y estado de la réplica -----------------------------

  async getCampuses() {
    await delay()

    return CAMPUSES
  },

  async getProfile() {
    await delay()
    const xp = levelFor(state.xp)
    const helps = Object.values(state.reactions).reduce((sum, count) => sum + count, 0)
    const achievement = (id: AchievementId, progress: number, goal: number) => ({
      id,
      goal,
      progress: Math.min(progress, goal),
      unlocked: progress >= goal,
    })

    return {
      login: ME.login,
      campusId: state.campusId,
      homeCampusId: ME.campusId,
      lang: null,
      admin: false,
      xp,
      title: state.title,
      titles: TITLES.map((title) => ({ ...title, unlocked: xp.level >= title.level })),
      achievements: [
        achievement('first_duty', localStorage.getItem(AVAILABLE_KEY) === null ? 0 : 1, 1),
        achievement('group_therapy', 6, 10),
        achievement('selfless_help', 10, 10),
        achievement('board_teacher', 0, 1),
        achievement('campus_guardian', helps, 25),
      ],
      reactions: state.reactions,
      rules: {
        therapy_session: 10,
        specialist_help: 40,
        peer_help: 15,
        board_host: 50,
        doubt_solved: 25,
        guide_proposal: 15,
        guide_review: 5,
        first_duty: 0,
      },
      // Reparto de ejemplo: lo que no cuadra con el total se atribuye a las terapias.
      earned: {
        specialist_help: { xp: 160, times: 4 },
        peer_help: { xp: 45, times: 3 },
        doubt_solved: { xp: 50, times: 2 },
        guide_proposal: { xp: 15, times: 1 },
        guide_review: { xp: 10, times: 2 },
        board_host: { xp: 0, times: 0 },
        therapy_session: {
          xp: Math.max(0, state.xp - 280),
          times: Math.floor(Math.max(0, state.xp - 280) / 10),
        },
        first_duty: { xp: 0, times: 1 },
      },
    }
  },

  async updateSettings(settings) {
    await delay(100)

    if (settings.campusId !== undefined) state.campusId = settings.campusId

    const title = TITLES.find((candidate) => candidate.id === settings.title)

    if (title !== undefined) state.title = title.id
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

  async searchNetworkPeople(q) {
    await delay(120)

    return mockPeople(ME.login, q)
  },

  async getHealth() {
    await delay()

    // Alguien en el círculo 3 que empezó hace 146 días: ya no llega a pace 12.
    const start = Date.now() - 146 * 86_400_000
    const at = (days: number): string => new Date(start + days * 86_400_000).toISOString()

    return {
      startedAt: at(0),
      blackholedAt: at(320),
      currentCircle: 3,
      milestones: [at(1), at(31), at(94)],
    }
  },

  async getLeaderboard(period) {
    await delay()

    // "Desde siempre" es lo mismo con más puntos: basta para ver el cambio.
    const scale = period === 'all' ? 3 : 1
    const mine = Math.max(0, state.xp - 340) + 60
    const rows = [...RANKING, { login: ME.login, image: null, xp: mine }]
      .map((row) => ({ ...row, xp: row.xp * scale }))
      .sort((a, b) => b.xp - a.xp)
    const entries = rows.map((row, index) => ({ ...row, rank: index + 1 }))

    return {
      period,
      entries,
      me: entries.find((entry) => entry.login === ME.login) ?? null,
    }
  },

  // --- Ayuda reservada ---------------------------------------------------------

  async getHelpDay() {
    await delay()

    return helpDay()
  },

  async setHelpDay(day) {
    await delay()

    if (helpDay().mustRate) {
      throw fail(409, 'Antes de ofrecerte, valora las sesiones que tienes pendientes')
    }

    state.help.windows = day.windows
    state.help.maxMinutes = day.maxMinutes

    return helpDay()
  },

  async getHelpOffers() {
    await delay()
    const taken = new Set(
      state.help.bookings
        .filter((booking) => booking.role === 'requester' && booking.status !== 'cancelled')
        .map((booking) => `${booking.helper}@${booking.start}`),
    )

    return offers()
      .filter((offer) => !state.help.blocked.includes(offer.login))
      .map((offer) => ({
        ...offer,
        freeStarts: offer.freeStarts.filter((start) => !taken.has(`${offer.login}@${start}`)),
      }))
  },

  async bookHelp(booking) {
    await delay()

    if (helpDay().mustRate) {
      throw fail(409, 'Antes de reservar, valora las sesiones que tienes pendientes')
    }
    if (
      state.help.bookings.some(
        (other) =>
          other.helper === booking.helper &&
          other.day === today() &&
          (other.status === 'pending' || other.status === 'confirmed') &&
          !other.finished,
      )
    ) {
      throw fail(409, `Ya tienes una reserva hoy con ${booking.helper}`)
    }

    const [hours = '0', minutes = '0'] = booking.start.split(':')
    const end = Number(hours) * 60 + Number(minutes) + booking.minutes
    const created: Booking = {
      id: nextId++,
      helper: booking.helper,
      requester: ME.login,
      peer: { login: booking.helper, image: null },
      role: 'requester',
      projectId: booking.projectId ?? null,
      projectName: typeof booking.projectId === 'number' ? projectName(booking.projectId) : null,
      day: today(),
      start: booking.start,
      end: `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`,
      note: emptyToNull(booking.note),
      status: 'pending',
      finished: false,
      verified: false,
      ratedByMe: false,
      ratedByPeer: false,
      xp: null,
    }

    state.help.bookings.push(created)

    return created
  },

  async respondBooking(id, accept) {
    await delay()
    find(state.help.bookings, id, 'Esa reserva').status = accept ? 'confirmed' : 'declined'
  },

  async cancelBooking(id) {
    await delay()
    find(state.help.bookings, id, 'Esa reserva').status = 'cancelled'
  },

  async rateBooking(id) {
    await delay()
    const booking = find(state.help.bookings, id, 'Esa reserva')

    booking.ratedByMe = true

    if (!booking.ratedByPeer) {
      return { xp: null }
    }

    // Están las dos valoraciones: se cierra. Sin comprobación, a cero.
    booking.xp = booking.verified ? 40 : 0

    return { xp: booking.xp }
  },

  async blockHelp(login) {
    await delay()

    if (!state.help.blocked.includes(login)) state.help.blocked.push(login)

    for (const booking of state.help.bookings) {
      if (booking.requester === login && booking.status === 'pending') booking.status = 'declined'
    }
  },

  async unblockHelp(login) {
    await delay()
    state.help.blocked = state.help.blocked.filter((other) => other !== login)
  },

  async getHelpReputation() {
    await delay()

    return { asked: { prepared: 4, curious: 6, autonomous: 2, basics: 1 } }
  },

  // --- Terapias de grupo -------------------------------------------------------

  async getGroups(projectId) {
    await delay()

    return state.groups
      .filter(
        (group) => projectId === undefined || projectId === null || group.projectId === projectId,
      )
      .map(groupView)
  },

  async createGroup(group) {
    await delay()

    const created: StoredGroup = {
      id: nextId++,
      creator: ME.login,
      members: [ME.login],
      projectId: group.projectId,
      projectName: projectName(group.projectId),
      place: group.place,
      dates: [...new Set(group.dates)].sort(),
      start: group.start,
      end: group.end,
      capacity: group.capacity ?? 5,
      note: emptyToNull(group.note),
      seats: [...new Set((group.seats ?? []).map((host) => host.toLowerCase()))],
    }

    state.groups.unshift(created)

    return groupView(created)
  },

  async updateGroup(id, group) {
    await delay()
    const current = find(state.groups, id, 'Ese grupo')

    if (current.creator !== ME.login) {
      throw fail(403, 'Solo quien abrió el grupo puede cambiarlo')
    }

    Object.assign(current, {
      projectId: group.projectId,
      projectName: projectName(group.projectId),
      place: group.place,
      dates: [...new Set(group.dates)].sort(),
      start: group.start,
      end: group.end,
      capacity: group.capacity ?? current.capacity,
      note: emptyToNull(group.note),
      seats: [...new Set((group.seats ?? []).map((host) => host.toLowerCase()))],
    })

    return groupView(current)
  },

  async joinGroup(id) {
    await delay()
    const group = find(state.groups, id, 'Ese grupo')

    if (group.members.length >= group.capacity) {
      throw fail(409, 'El grupo está completo')
    }

    if (!group.members.includes(ME.login)) group.members.push(ME.login)
  },

  async leaveGroup(id) {
    await delay()
    const group = find(state.groups, id, 'Ese grupo')

    group.members = group.members.filter((login) => login !== ME.login)

    if (group.members.length === 0) {
      state.groups = state.groups.filter((other) => other !== group)
    }
  },

  async closeGroup(id) {
    await delay()
    state.groups = state.groups.filter((group) => group.id !== id)
  },

  // --- Tablón de dudas ---------------------------------------------------------

  async getDoubtGraph() {
    await delay()

    return {
      track: 'next',
      level: 1.42,
      // Empezó hace algo más de mes y medio.
      startedAt: new Date(Date.now() - 50 * 86_400_000).toISOString(),
      currentCircle: CURRENT_CIRCLE,
      knownUpTo: CORE.length - 1,
      circles: CORE.map(({ circle, projects }) => ({
        circle,
        projects: projects.map(({ id, name, short, hours }) => {
          const status = PROJECTS.find((project) => project.id === id)?.status ?? 'todo'
          const unanswered = state.doubts.filter(
            (doubt) =>
              doubt.projectId === id &&
              !doubt.resolved &&
              doubt.replies.length === 0 &&
              doubt.author !== ME.login,
          ).length

          // Mismas reglas que la API: cada aviso solo a quien le sirve.
          return {
            projectId: id,
            name,
            short,
            status,
            // Libft, con todos los bonus.
            perfect: id === 1312,
            hours,
            series: /^(.+) Module \d+$/.exec(name)?.[1] ?? null,
            locked: status === 'todo' && circle > CURRENT_CIRCLE,
            signals: {
              unanswered: status === 'todo' ? 0 : unanswered,
              proposals:
                status === 'finished'
                  ? state.proposals.filter((proposal) => proposal.projectId === id).length
                  : 0,
              missingGuide: status === 'finished' && state.guides[id] === undefined,
            },
          }
        }),
      })),
    }
  },

  async getDoubtBoard(projectId) {
    await delay()
    const canEditGuide = isSpecialist(projectId)

    return {
      project: { id: projectId, name: projectName(projectId) },
      guide: state.guides[projectId] ?? EMPTY_GUIDE,
      canEditGuide,
      proposals: canEditGuide
        ? state.proposals
            .filter((proposal) => proposal.projectId === projectId)
            .map(({ id, author, section, body }) => ({ id, author, section, body }))
        : [],
      recentChanges: canEditGuide
        ? state.changes
            .filter((change) => change.projectId === projectId)
            .map(({ flaggedBy, projectId: _projectId, ...change }) => ({
              ...change,
              flags: flaggedBy.length,
              flaggedByMe: flaggedBy.includes(ME.login),
              canFlag:
                change.proposer !== ME.login &&
                change.validator !== ME.login &&
                !flaggedBy.includes(ME.login),
            }))
        : [],
      sanctions: { proposeBlockedUntil: null, reviewBlockedUntil: null },
      doubts: state.doubts
        .filter((doubt) => doubt.projectId === projectId)
        .sort(
          (a, b) =>
            Number(a.resolved) - Number(b.resolved) || b.createdAt.localeCompare(a.createdAt),
        )
        .map(doubtView),
    }
  },

  async createDoubt(projectId, body) {
    await delay()

    const doubt: StoredDoubt = {
      id: nextId++,
      projectId,
      author: ME.login,
      body,
      color: Math.floor(Math.random() * 5),
      resolved: false,
      solvedAnswerId: null,
      createdAt: new Date().toISOString(),
      replies: [],
    }

    state.doubts.push(doubt)

    return doubtView(doubt)
  },

  async updateDoubt(id, body) {
    await delay()
    const doubt = find(state.doubts, id, 'Esa duda')

    if (doubt.resolved) {
      throw fail(409, 'Para cambiar una duda resuelta, primero reábrela')
    }

    doubt.body = body

    return doubtView(doubt)
  },

  async getDoubt(id) {
    await delay(120)
    const doubt = find(state.doubts, id, 'Esa duda')

    return {
      ...doubtView(doubt),
      replies: [...doubt.replies],
      solvedAnswerId: doubt.solvedAnswerId,
    }
  },

  async answerDoubt(id, body) {
    await delay()
    const doubt = find(state.doubts, id, 'Esa duda')

    doubt.replies.push({
      id: nextId++,
      author: ME.login,
      body,
      specialist: isSpecialist(doubt.projectId),
      createdAt: new Date().toISOString(),
    })

    return [...doubt.replies]
  },

  async setDoubtResolved(id, answerId) {
    await delay()
    const doubt = find(state.doubts, id, 'Esa duda')

    if (answerId !== null && !doubt.replies.some((reply) => reply.id === answerId)) {
      throw fail(400, 'Para darla por resuelta, indica qué respuesta la resolvió')
    }

    doubt.resolved = answerId !== null
    doubt.solvedAnswerId = answerId
  },

  async removeDoubt(id) {
    await delay()
    state.doubts = state.doubts.filter((doubt) => doubt.id !== id)
  },

  async saveGuide(projectId, guide) {
    await delay()

    if (!isSpecialist(projectId)) {
      throw fail(403, 'La guía la mantienen quienes ya aprobaron el proyecto')
    }

    const saved: Guide = { ...guide, updatedBy: ME.login, updatedAt: new Date().toISOString() }

    state.guides[projectId] = saved

    return saved
  },

  async proposeGuideChange(projectId, section, body) {
    await delay()
    state.proposals.push({ id: nextId++, projectId, author: ME.login, section, body })
  },

  async reviewProposal(id, accept) {
    await delay()
    const proposal = find(state.proposals, id, 'Esa propuesta')

    if (proposal.author === ME.login) {
      throw fail(403, 'Un cambio tuyo lo tiene que validar otra persona')
    }

    if (accept) {
      const guide = state.guides[proposal.projectId] ?? EMPTY_GUIDE

      state.changes.unshift({
        id: nextId++,
        projectId: proposal.projectId,
        section: proposal.section,
        body: proposal.body,
        proposer: proposal.author,
        validator: ME.login,
        acceptedAt: new Date().toISOString(),
        flaggedBy: [],
      })

      state.guides[proposal.projectId] = {
        ...guide,
        [proposal.section]: [...guide[proposal.section], proposal.body],
        updatedBy: ME.login,
        updatedAt: new Date().toISOString(),
      }
    }

    state.proposals = state.proposals.filter((other) => other !== proposal)
  },

  async flagGuideChange(id) {
    await delay()
    const change = find(state.changes, id, 'Ese cambio')

    change.flaggedBy.push(ME.login)

    if (change.flaggedBy.length < 2) {
      return { revoked: false }
    }

    // Dos señales: el cambio se retira y la línea sale de la guía.
    const guide = state.guides[change.projectId] ?? EMPTY_GUIDE

    state.guides[change.projectId] = {
      ...guide,
      [change.section]: guide[change.section].filter((line) => line !== change.body),
    }
    state.changes = state.changes.filter((other) => other !== change)

    return { revoked: true }
  },

  // --- Pizarras ----------------------------------------------------------------

  async getBoards(from, to) {
    await delay()

    return state.boards
      .filter((board) => board.startsAt >= from && board.startsAt < to)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map(boardView)
  },

  async createBoard(board) {
    await delay()

    const created: StoredBoard = {
      id: nextId++,
      host: ME.login,
      hostImage: ME.image,
      title: board.title,
      topic: emptyToNull(board.topic),
      description: emptyToNull(board.description),
      place: board.place,
      startsAt: board.startsAt,
      endsAt: board.endsAt,
      capacity: board.capacity ?? 20,
      attendees: [],
    }

    state.boards.push(created)

    return boardView(created)
  },

  async updateBoard(id, board) {
    await delay()
    const current = find(state.boards, id, 'Esa pizarra')

    if (current.host !== ME.login) {
      throw fail(403, 'Solo quien imparte la pizarra puede cambiarla')
    }

    Object.assign(current, {
      title: board.title,
      topic: emptyToNull(board.topic),
      description: emptyToNull(board.description),
      place: board.place,
      startsAt: board.startsAt,
      endsAt: board.endsAt,
      capacity: board.capacity ?? current.capacity,
    })

    return boardView(current)
  },

  async joinBoard(id) {
    await delay()
    const board = find(state.boards, id, 'Esa pizarra')

    if (board.attendees.length >= board.capacity) {
      throw fail(409, 'No quedan plazas')
    }

    if (!board.attendees.includes(ME.login)) board.attendees.push(ME.login)
  },

  async leaveBoard(id) {
    await delay()
    const board = find(state.boards, id, 'Esa pizarra')

    board.attendees = board.attendees.filter((login) => login !== ME.login)
  },

  async cancelBoard(id) {
    await delay()
    state.boards = state.boards.filter((board) => board.id !== id)
  },
}
