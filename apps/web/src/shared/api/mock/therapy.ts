/**
 * API de mentira: terapias de grupo.
 */

import { ME } from './data'
import type { StoredGroup } from './data'
import type { Api } from '../types'
import { state, delay, fail, emptyToNull, projectName, find, groupView, newId } from './state'

export const therapyMock: Pick<
  Api,
  'getGroups' | 'createGroup' | 'updateGroup' | 'joinGroup' | 'leaveGroup' | 'closeGroup'
> = {
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
      id: newId(),
      creator: ME.login,
      members: [ME.login],
      projectId: group.projectId,
      projectName: projectName(group.projectId),
      place: group.place,
      dates: [...new Set(group.dates)].sort(),
      start: group.start,
      end: group.end,
      // Con puestos, las plazas son los puestos.
      capacity: (group.seats ?? []).length > 0 ? (group.seats ?? []).length : (group.capacity ?? 5),
      note: emptyToNull(group.note),
      seats: [...new Set((group.seats ?? []).map((host) => host.toLowerCase()))],
      kind: group.kind ?? 'study',
      progress: group.progress === undefined ? {} : { [ME.login]: group.progress },
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
      capacity: (group.seats ?? []).length > 0 ? (group.seats ?? []).length : current.capacity,
      note: emptyToNull(group.note),
      seats: [...new Set((group.seats ?? []).map((host) => host.toLowerCase()))],
    })

    return groupView(current)
  },

  async joinGroup(id, progress) {
    await delay()
    const group = find(state.groups, id, 'Ese grupo')

    if (group.kind === 'review' && progress !== 100) {
      throw fail(
        409,
        'Este grupo es de repaso: es para quien ya tiene el proyecto terminado al 100 %',
      )
    }
    if (progress !== undefined) group.progress[ME.login] = progress

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
}
