/**
 * Cliente real contra la API.
 */

import type { AvailabilityResponse, Peer } from '@sanatorio/contracts'

import { apiUrl, fetchApi, getJson, intHeader, send, sendJson } from './http'
import type { Api } from './types'

/** Los parámetros de una dirección, sin los que no vengan. */
const search = (query: Record<string, string | number | undefined>): string =>
  new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, String(value)]],
    ),
  ).toString()

export const realApi: Api = {
  getMe: () => getJson('/auth/me'),

  login() {
    window.location.href = apiUrl('/auth/login')

    // No se resuelve nunca: el navegador se está yendo a 42.
    return new Promise<void>(() => undefined)
  },

  logout: () => send('POST', '/auth/logout'),

  getMyProjects: (all = false) => getJson(all ? '/me/projects?scope=all' : '/me/projects'),

  // El cuerpo trae solo los accionables; el tamaño real del proyecto viaja en
  // cabeceras. Se leen aquí porque el resto de la web solo debe saber de datos.
  getPeers: async (projectId) => {
    const response = await fetchApi(`/projects/${projectId}/peers`)

    return {
      peers: (await response.json()) as Peer[],
      total: intHeader(response, 'x-total-participants'),
      partial: response.headers.get('x-partial') === 'true',
    }
  },

  getAvailability: async () => (await getJson<AvailabilityResponse>('/me/availability')).available,

  setAvailability: (available) => sendJson('PUT', '/me/availability', { available }),

  // Solo lo pide quien está mirando su calendario: lo de 42 de hace dos minutos como mucho.
  getCalendar: (from, to) =>
    getJson(`/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&fresh=1`),

  getProjectMap: (projectId) => getJson(`/projects/${projectId}/map`),
  getCampusMap: () => getJson('/map'),
  getQuizRooms: () => getJson('/quiz/rooms'),
  createQuizRoom: (settings) => sendJson('POST', '/quiz/rooms', settings),
  getQuizRoom: (id) => getJson(`/quiz/rooms/${id}`),
  joinQuizRoom: (id, team = null) => sendJson('POST', `/quiz/rooms/${id}/join`, { team }),
  leaveQuizRoom: (id) => send('POST', `/quiz/rooms/${id}/leave`),
  startQuizRoom: (id) => sendJson('POST', `/quiz/rooms/${id}/start`),
  answerQuiz: (id, question, option) =>
    sendJson('POST', `/quiz/rooms/${id}/answer`, { question, option }),
  getQuizReview: () => getJson('/quiz/review'),
  getTurnRooms: () => getJson('/games/rooms'),
  createTurnRoom: (settings) => sendJson('POST', '/games/rooms', settings),
  getTurnRoom: (id) => getJson(`/games/rooms/${id}`),
  joinTurnRoom: (id) => sendJson('POST', `/games/rooms/${id}/join`),
  leaveTurnRoom: (id) => send('POST', `/games/rooms/${id}/leave`),
  startTurnRoom: (id) => sendJson('POST', `/games/rooms/${id}/start`),
  moveTurn: (id, move) => sendJson('POST', `/games/rooms/${id}/move`, move),
  answerTurn: (id, question, option) =>
    sendJson('POST', `/games/rooms/${id}/answer`, { question, option }),
  resignTurn: (id) => sendJson('POST', `/games/rooms/${id}/resign`),
  getExamStats: () => getJson('/exams/stats'),
  getLiveExam: () => getJson('/exams/live'),
  reportBrokenSeat: (host) => send('POST', `/map/seats/${encodeURIComponent(host)}/broken`),
  clearBrokenSeat: (host) => send('DELETE', `/map/seats/${encodeURIComponent(host)}/broken`),
  getConversations: () => getJson('/conversations'),
  markConversation: (change) => sendJson('PUT', '/conversations/mark', change),

  getCampuses: () => getJson('/campuses'),
  getProfile: () => getJson('/me/profile'),
  getEventAlerts: () => getJson('/events/alerts'),
  ackEventAlert: (id) => send('POST', '/events/alerts/ack', { id }),
  getEventThread: (id, after) =>
    getJson(
      `/events/thread?id=${encodeURIComponent(id)}${after === undefined ? '' : `&after=${after}`}`,
    ),
  sendEventMessage: (message) => sendJson('POST', '/events/messages', message),
  getEventAttendance: (id) => getJson(`/events/attendance?id=${encodeURIComponent(id)}`),
  checkinEvent: (id, code) => sendJson('POST', '/events/checkin', { id, code }),
  attendanceReportUrl: (query) =>
    apiUrl(`/events/report?${new URLSearchParams({ ...query, format: 'csv' }).toString()}`),
  staffLogin: (key) => send('POST', '/auth/staff', { key }),
  getStaffMe: () => getJson('/staff/me'),
  getStaffDocument: (code) => getJson(`/staff/documents/${encodeURIComponent(code)}`),
  compareStaffDocument: (code, content) =>
    sendJson('POST', `/staff/documents/${encodeURIComponent(code)}/compare`, { content }),
  getStaffAccounts: () => getJson('/admin/staff'),
  createStaffAccount: (name) => sendJson('POST', '/admin/staff', { name }),
  revokeStaffAccount: (id) => send('DELETE', `/admin/staff/${id}`),
  openTicket: (ticket) => sendJson('POST', '/tickets', ticket),
  getMyTickets: () => getJson('/tickets/mine'),

  withdrawTicket: (id) => send('DELETE', `/tickets/${id}`),
  getAdminConsumption: () => getJson('/admin/consumption'),
  setAdminBudget: (changes) => sendJson('PUT', '/admin/budget', changes),
  getAdminPeople: () => getJson('/admin/people'),
  setAdminRole: (login, admin) => send('PUT', '/admin/roles', { login, admin }),
  blockUser: (login, reason, days) =>
    send('PUT', '/admin/blocks', { login, reason, ...(days === null ? {} : { days }) }),
  unblockUser: (login) => send('DELETE', `/admin/blocks/${encodeURIComponent(login)}`),
  setUserLimit: (login, perHour) => send('PUT', '/admin/limits', { login, perHour }),
  getAdminTickets: () => getJson('/admin/tickets'),
  removeTicket: (id) => send('DELETE', `/admin/tickets/${id}`),

  getLegal: () => getJson('/me/legal'),
  acceptLegal: (version) => sendJson('POST', '/me/legal/accept', { version }),
  exportUrl: () => apiUrl('/me/export'),

  getSecondFactor: () => getJson('/admin/totp'),
  setupSecondFactor: () => sendJson('POST', '/admin/totp/setup'),
  confirmSecondFactor: (code) => send('POST', '/admin/totp/confirm', { code }),
  verifySecondFactor: (code) => send('POST', '/admin/totp/verify', { code }),
  lockPanel: () => send('POST', '/admin/totp/lock'),

  answerTicket: (id, answer, status) =>
    sendJson('POST', `/admin/tickets/${id}/answer`, { answer, status }),
  getAdminMessages: () => getJson('/admin/messages'),
  getUsage: () => getJson('/usage'),
  sendUsage: (counts, time, flows) => send('POST', '/usage', { counts, time, flows }),
  getFlows: (query) => getJson(`/admin/flows?${search(query)}`),
  getOnline: () => getJson('/admin/online'),
  getTourSpeeds: () => getJson('/tours/speeds'),
  sendTourSpeed: (name, rate) => sendJson('POST', '/tours/speed', { name, rate }),
  getTourStats: () => getJson('/admin/tours'),
  searchPeople: (q) => getJson(`/users/search?${search({ q })}`),
  getStats: (query) => getJson(`/admin/stats?${search(query)}`),
  getUsageHeatmap: (by, segment = {}) => getJson(`/usage/heatmap?${search({ by, ...segment })}`),
  getPublicProfile: (login) => getJson(`/users/${encodeURIComponent(login)}/profile`),
  updateSettings: (settings) => send('PUT', '/me/settings', settings),
  getSyncStatus: () => getJson('/sync/status'),
  getPulse: () => getJson('/pulse'),
  getClicker: () => getJson('/clicker'),
  pressPlus: (count) => sendJson('POST', '/clicker/plus', { count }),
  choosePill: (pill) => sendJson('POST', '/clicker/pill', { pill }),
  saveClicker: (save) => sendJson('PUT', '/clicker/save', save),
  getClickerBoard: () => getJson('/clicker/board'),
  getClickerUsage: (days) => getJson(`/admin/clicker?days=${days}`),
  getClickerCapital: ({ login, from, to } = {}) => {
    const query = new URLSearchParams({
      ...(login === undefined ? {} : { login }),
      ...(from === undefined ? {} : { from: String(from) }),
      ...(to === undefined ? {} : { to: String(to) }),
    }).toString()

    return getJson(`${login === undefined ? '' : '/admin'}/clicker/capital?${query}`)
  },
  getAdminData: () => getJson('/admin/data'),
  previewAdminData: (scope) => sendJson('POST', '/admin/data/preview', scope),
  deleteAdminData: (scope) => sendJson('POST', '/admin/data/delete', scope),
  getClickerCheats: () => getJson('/admin/clicker/cheats'),
  pardonClickerCheat: (id) => send('POST', `/admin/clicker/cheats/${id}/pardon`),
  dismissClickerAlert: (id) => send('DELETE', `/admin/clicker/alerts/${id}`),
  reviewClickerAlert: (id, verdict) =>
    send('POST', `/admin/clicker/alerts/${id}/review`, { verdict }),
  getClickerReviews: () => getJson('/clicker/reviews'),
  defendClickerReview: (id, answer) => send('POST', `/clicker/reviews/${id}`, { answer }),
  claimClickerPool: () => sendJson('POST', '/clicker/pool/claim'),
  ackClickerSeizure: () => send('POST', '/clicker/seizure/ack'),
  sanctionClicker: (sanction) => send('POST', '/admin/clicker/sanction', sanction),
  getClickerGameOf: (login) => getJson(`/admin/clicker/game?login=${encodeURIComponent(login)}`),
  getBroadcasts: () => getJson('/broadcasts'),
  answerBroadcast: (id, answer) => sendJson('POST', `/broadcasts/${id}/answer`, answer),
  getAdminBroadcasts: () => getJson('/admin/broadcasts'),
  sendBroadcast: (message) => sendJson('POST', '/admin/broadcasts', message),
  removeBroadcast: (id) => send('DELETE', `/admin/broadcasts/${id}`),
  getNotices: () => getJson('/notices'),
  readNotices: (ids) => sendJson('POST', '/notices/read', ids === undefined ? {} : { ids }),

  removeNotices: (which) => sendJson('POST', '/notices/remove', which),

  saveNotice: (id, saved) => sendJson('POST', '/notices/save', { id, saved }),
  getAdminQuota: () => getJson('/admin/quota'),
  setAdminQuota: (changes) => sendJson('PUT', '/admin/quota', changes),

  getLeaderboard: (period) => getJson(`/leaderboard?period=${period}`),
  getHelpStats: (period) => getJson(`/stats?period=${period}`),
  getHealth: () => getJson('/me/health'),
  declarePace: (ref) => sendJson('PUT', '/me/health/pace', ref),

  getNetwork: (params) => {
    const query = new URLSearchParams()

    for (const [key, value] of Object.entries(params)) {
      query.set(key, String(value))
    }

    return getJson(`/network?${query.toString()}`)
  },
  getNetworkPair: (a, b, params) => {
    const query = new URLSearchParams({ a, b })

    if (params.from !== undefined) query.set('from', params.from)
    if (params.to !== undefined) query.set('to', params.to)
    if (params.projectId !== undefined) query.set('projectId', String(params.projectId))
    if (params.verdict !== undefined) query.set('verdict', params.verdict)
    if (params.campuses !== undefined) query.set('campuses', params.campuses)

    return getJson(`/network/pair?${query.toString()}`)
  },
  getNetworkStrictest: (min, order, params) => {
    const query = new URLSearchParams({ min: String(min), order })

    if (params.from !== undefined) query.set('from', params.from)
    if (params.to !== undefined) query.set('to', params.to)
    if (params.projectId !== undefined) query.set('projectId', String(params.projectId))
    if (params.campuses !== undefined) query.set('campuses', params.campuses)

    return getJson(`/network/strictest?${query.toString()}`)
  },
  getNetworkMine: () => getJson('/network/mine'),
  searchNetworkPeople: (q, campuses) => getJson(`/network/people?${search({ q, campuses })}`),

  getHelpDay: () => getJson('/help/today'),
  setHelpDay: (day) => sendJson('PUT', '/help/today', day),
  getHelpOffers: () => getJson('/help/offers'),
  bookHelp: (booking) => sendJson('POST', '/help/bookings', booking),
  respondBooking: (id, accept) =>
    send('POST', `/help/bookings/${id}/${accept ? 'accept' : 'decline'}`),
  cancelBooking: (id) => send('DELETE', `/help/bookings/${id}`),
  getHelpInbox: () => getJson('/help/inbox'),
  seenBooking: (id) => send('POST', `/help/bookings/${id}/seen`),
  rateBooking: (id, tag) => sendJson('POST', `/help/bookings/${id}/rating`, { tag }),
  blockHelp: (login) => send('POST', '/help/blocks', { login }),
  unblockHelp: (login) => send('DELETE', `/help/blocks/${encodeURIComponent(login)}`),
  getHelpReputation: () => getJson('/help/reputation'),

  getGroups: (projectId) =>
    getJson(
      projectId === undefined || projectId === null ? '/groups' : `/groups?project=${projectId}`,
    ),
  createGroup: (group) => sendJson('POST', '/groups', group),
  updateGroup: (id, group) => sendJson('PUT', `/groups/${id}`, group),
  joinGroup: (id, progress) =>
    send('POST', `/groups/${id}/join`, progress === undefined ? {} : { progress }),
  leaveGroup: (id) => send('DELETE', `/groups/${id}/join`),
  closeGroup: (id) => send('DELETE', `/groups/${id}`),
  inviteGroup: (id) => sendJson('POST', `/groups/${id}/invite`),

  getDoubtGraph: () => getJson('/doubts/graph'),
  getDoubtBoard: (projectId) => getJson(`/projects/${projectId}/doubts`),
  createDoubt: (projectId, body) => sendJson('POST', `/projects/${projectId}/doubts`, { body }),
  updateDoubt: (id, body) => sendJson('PUT', `/doubts/${id}`, { body }),
  getDoubt: (id) => getJson(`/doubts/${id}`),
  answerDoubt: (id, body) => sendJson('POST', `/doubts/${id}/answers`, { body }),
  setDoubtResolved: (id, answerId) =>
    send(
      'PUT',
      `/doubts/${id}/resolved`,
      answerId === null ? { resolved: false } : { resolved: true, answerId },
    ),
  removeDoubt: (id) => send('DELETE', `/doubts/${id}`),
  saveGuide: (projectId, guide) => sendJson('PUT', `/projects/${projectId}/guide`, guide),
  proposeGuideChange: (projectId, section, body) =>
    send('POST', `/projects/${projectId}/guide/proposals`, { section, body }),
  reviewProposal: (id, accept) =>
    send('POST', `/guide-proposals/${id}/${accept ? 'accept' : 'reject'}`),
  flagGuideChange: (id) => sendJson('POST', `/guide-changes/${id}/flag`),

  getBoards: (from, to) =>
    getJson(`/boards?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  createBoard: (board) => sendJson('POST', '/boards', board),
  updateBoard: (id, board) => sendJson('PUT', `/boards/${id}`, board),
  joinBoard: (id) => send('POST', `/boards/${id}/join`),
  leaveBoard: (id) => send('DELETE', `/boards/${id}/join`),
  cancelBoard: (id) => send('DELETE', `/boards/${id}`),
}
