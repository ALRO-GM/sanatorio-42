/**
 * API de mentira: la sesión, la sala de espera, el calendario personal y el mapa.
 */

import { CAMPUSES, ME, PEERS, PROJECTS } from './data'
import { calendarEvents } from './calendar'
import type { Api } from '../types'
import {
  LOGGED_KEY,
  AVAILABLE_KEY,
  state,
  delay,
  fail,
  isLoggedIn,
  buildMap,
  resetState,
} from './state'
import { closeStaffSession } from './staff'

export const peersMock: Pick<
  Api,
  | 'getMe'
  | 'login'
  | 'logout'
  | 'getMyProjects'
  | 'getPeers'
  | 'getAvailability'
  | 'setAvailability'
  | 'getCalendar'
  | 'getProjectMap'
  | 'getCampusMap'
  | 'getCampuses'
> = {
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
    closeStaffSession()
    resetState()
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
}
