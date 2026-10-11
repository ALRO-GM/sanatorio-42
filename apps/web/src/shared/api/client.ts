/**
 * Cliente real contra la API.
 */

import type { AvailabilityResponse, Peer } from '@sanatorio/contracts'

import { apiUrl, fetchApi, getJson, intHeader, send, sendJson } from './http'
import type { Api } from './types'

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

  getCalendar: (from, to) =>
    getJson(`/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),

  getProjectMap: (projectId) => getJson(`/projects/${projectId}/map`),
  getCampusMap: () => getJson('/map'),

  getCampuses: () => getJson('/campuses'),
  getProfile: () => getJson('/me/profile'),
  updateSettings: (settings) => send('PUT', '/me/settings', settings),
  getSyncStatus: () => getJson('/sync/status'),

  getLeaderboard: (period) => getJson(`/leaderboard?period=${period}`),
  getHealth: () => getJson('/me/health'),

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

    return getJson(`/network/pair?${query.toString()}`)
  },
  getNetworkStrictest: (min, order, params) => {
    const query = new URLSearchParams({ min: String(min), order })

    if (params.from !== undefined) query.set('from', params.from)
    if (params.to !== undefined) query.set('to', params.to)
    if (params.projectId !== undefined) query.set('projectId', String(params.projectId))

    return getJson(`/network/strictest?${query.toString()}`)
  },
  getNetworkMine: () => getJson('/network/mine'),
  searchNetworkPeople: (q) => getJson(`/network/people?q=${encodeURIComponent(q)}`),

  getHelpDay: () => getJson('/help/today'),
  setHelpDay: (day) => sendJson('PUT', '/help/today', day),
  getHelpOffers: () => getJson('/help/offers'),
  bookHelp: (booking) => sendJson('POST', '/help/bookings', booking),
  respondBooking: (id, accept) =>
    send('POST', `/help/bookings/${id}/${accept ? 'accept' : 'decline'}`),
  cancelBooking: (id) => send('DELETE', `/help/bookings/${id}`),
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
  joinGroup: (id) => send('POST', `/groups/${id}/join`),
  leaveGroup: (id) => send('DELETE', `/groups/${id}/join`),
  closeGroup: (id) => send('DELETE', `/groups/${id}`),

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
