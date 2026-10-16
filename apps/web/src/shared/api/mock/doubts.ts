/**
 * API de mentira: tablón de dudas y guías.
 */

import type { Guide } from '@sanatorio/contracts'
import { CORE, CURRENT_CIRCLE, ME, PROJECTS } from './data'
import type { StoredDoubt } from './data'
import type { Api } from '../types'
import {
  EMPTY_GUIDE,
  state,
  delay,
  fail,
  projectName,
  isSpecialist,
  find,
  doubtView,
  newId,
} from './state'

export const doubtsMock: Pick<
  Api,
  | 'getDoubtGraph'
  | 'getDoubtBoard'
  | 'createDoubt'
  | 'updateDoubt'
  | 'getDoubt'
  | 'answerDoubt'
  | 'setDoubtResolved'
  | 'removeDoubt'
  | 'saveGuide'
  | 'proposeGuideChange'
  | 'reviewProposal'
  | 'flagGuideChange'
> = {
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
            // Como la API: el módulo y su `bis` son un solo hueco.
            choice: /^Python Module 0[56]( bis)?$/.test(name)
              ? `python-${name.slice(14, 16)}`
              : null,
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
      id: newId(),
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
      id: newId(),
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
    state.proposals.push({ id: newId(), projectId, author: ME.login, section, body })
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
        id: newId(),
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
}
