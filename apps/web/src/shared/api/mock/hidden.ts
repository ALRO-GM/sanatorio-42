/**
 * Personas ocultas en la API simulada (`docs/personas-ocultas.md`): la lista
 * del panel y su efecto. Como en la API, quien está oculto al grupo de quien
 * mira (estudiante o, con `localStorage.mock_pool`, piscinero) no sale en el
 * buscador, el mapa, la sala de espera ni las redes, y su ficha y su perfil
 * dan 404. A sí mismo se ve cada cual.
 */

import type { ClusterMap, HiddenCandidate, HiddenPerson } from '@sanatorio/contracts'

import type { Api } from '../types'
import { ME } from './data'
import { poolPreviewing } from './pool'
import { portrait } from './portrait'
import { delay, fail } from './state'

let hidden: HiddenPerson[] = []

/** Gente inventada de los dos grupos para el buscador del panel. */
const CANDIDATES: HiddenCandidate[] = [
  { login: 'jdoe', name: 'Jane Doe', image: null, group: 'student' },
  { login: 'rsoto', name: 'Rocío Soto', image: null, group: 'student' },
  { login: 'mlopez', name: 'Mario López', image: null, group: 'student' },
  { login: 'mgarcia', name: 'María García', image: null, group: 'student' },
  { login: 'lsoto', name: 'Lucía Soto', image: null, group: 'student' },
  { login: 'pisci-ana', name: null, image: null, group: 'pool' },
  { login: 'pisci-leo', name: null, image: null, group: 'pool' },
]

/** Si quien mira es de la piscina: lo mismo que lee `getPoolAccess`. */
const lookingFromPool = (): boolean =>
  localStorage.getItem('mock_pool') === 'true' || poolPreviewing()

/** Si `login` no existe para quien mira. */
const hiddenFromMe = (login: string): boolean =>
  login !== ME.login &&
  hidden.some(
    (entry) => entry.login === login && (lookingFromPool() ? entry.fromPool : entry.fromStudents),
  )

const copy = (): HiddenPerson[] => hidden.map((entry) => ({ ...entry }))

export const hiddenMock: Pick<
  Api,
  'getHiddenPeople' | 'searchHiddenCandidates' | 'hidePerson' | 'revealPerson'
> = {
  async getHiddenPeople() {
    await delay(60)

    return copy()
  },
  async searchHiddenCandidates(q) {
    await delay(80)

    const wanted = q.trim().toLowerCase()

    if (wanted.length < 2) return []

    return CANDIDATES.filter(
      (person) =>
        person.login.includes(wanted) || (person.name ?? '').toLowerCase().includes(wanted),
    ).map((person) => ({ ...person, image: portrait(person.login) }))
  },
  async hidePerson(login, input) {
    await delay(80)

    const who = login.trim().toLowerCase()

    if (!/^[a-z0-9-]{1,30}$/.test(who)) throw fail(400, 'login no válido')
    if (!input.fromStudents && !input.fromPool) throw fail(400, 'Elige al menos un grupo')

    const reason = input.reason?.trim() ?? ''
    const entry: HiddenPerson = {
      login: who,
      image: portrait(who),
      group: CANDIDATES.find((person) => person.login === who)?.group ?? null,
      fromStudents: input.fromStudents,
      fromPool: input.fromPool,
      reason: reason === '' ? null : reason,
      by: ME.login,
      at: new Date().toISOString(),
    }

    hidden = [entry, ...hidden.filter((each) => each.login !== who)]

    return copy()
  },
  async revealPerson(login) {
    await delay(60)
    hidden = hidden.filter((entry) => entry.login !== login)

    return copy()
  },
}

/** El mapa sin quien está oculto: su puesto sale libre. */
const withoutHidden = (map: ClusterMap): ClusterMap => ({
  ...map,
  clusters: map.clusters.map((cluster) => ({
    ...cluster,
    seats: cluster.seats.map((seat) =>
      seat.occupant !== null && hiddenFromMe(seat.occupant.login)
        ? { ...seat, occupant: null }
        : seat,
    ),
  })),
  unplaced: map.unplaced.filter((person) => !hiddenFromMe(person.login)),
})

/** La API simulada con los ocultos aplicados a lo que enseña gente. */
export function withHidden(api: Api): Api {
  const notFound = (login: string): void => {
    if (hiddenFromMe(login)) throw fail(404, 'No conocemos a nadie con ese login')
  }

  return {
    ...api,
    async searchPeople(q) {
      return (await api.searchPeople(q)).filter((person) => !hiddenFromMe(person.login))
    },
    async getPersonCard(login) {
      notFound(login)

      return api.getPersonCard(login)
    },
    async getPublicProfile(login) {
      notFound(login)

      return api.getPublicProfile(login)
    },
    async getPeers(projectId) {
      const result = await api.getPeers(projectId)

      return { ...result, peers: result.peers.filter((peer) => !hiddenFromMe(peer.login)) }
    },
    async getCampusMap() {
      return withoutHidden(await api.getCampusMap())
    },
    async getProjectMap(projectId) {
      return withoutHidden(await api.getProjectMap(projectId))
    },
    async getNetwork(params) {
      const graph = await api.getNetwork(params)

      return {
        ...graph,
        nodes: graph.nodes.filter((node) => !hiddenFromMe(node.login)),
        links: graph.links.filter(
          (link) => !hiddenFromMe(link.source) && !hiddenFromMe(link.target),
        ),
      }
    },
    async getSprintBoard(groupId) {
      const board = await api.getSprintBoard(groupId)

      return { ...board, members: board.members.filter((member) => !hiddenFromMe(member.login)) }
    },
    async getSeatGraph(days) {
      const graph = await api.getSeatGraph(days)

      return {
        ...graph,
        people: graph.people.filter((person) => !hiddenFromMe(person.login)),
        links: graph.links.filter(
          (link) => !hiddenFromMe(link.source) && !hiddenFromMe(link.target),
        ),
      }
    },
  }
}
