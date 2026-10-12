/**
 * API de mentira: expediente, preferencias, estado de salud y ranking.
 */

import { mockHacker } from './clicker'
import type { PaceRef } from '@sanatorio/contracts'

import { LEVEL_FLOORS, ME, RANKING, TITLES } from './data'
import { portrait } from './portrait'
import type { Api } from '../types'
import { AVAILABLE_KEY, state, delay, levelFor, achievement } from './state'

/** Lo que se anota en la tarjeta de salud: dura lo que dure la pestaña. */
let declared: PaceRef | null = null

export const profileMock: Pick<
  Api,
  | 'getPublicProfile'
  | 'getProfile'
  | 'updateSettings'
  | 'getHealth'
  | 'declarePace'
  | 'getLeaderboard'
> = {
  async getPublicProfile(login) {
    await delay()

    // Cada quien con un nivel distinto, siempre el mismo: sale de su login.
    const seed = Array.from(login).reduce((sum, char) => sum + char.charCodeAt(0), 0)
    const total = 40 + (seed % 9) * 85
    const level = LEVEL_FLOORS.filter((floor) => total >= floor).length

    return {
      login,
      hacks: 0,
      image: portrait(login),
      xp: {
        total,
        level,
        floor: LEVEL_FLOORS[level - 1] ?? 0,
        next: LEVEL_FLOORS[level] ?? null,
      },
      title: [...TITLES].reverse().find((entry) => level >= entry.level)?.id ?? 'paciente',
      achievements: [
        achievement('first_duty', 1, 1),
        achievement('group_therapy', seed % 10, 10),
        achievement('selfless_help', seed % 7, 10),
        achievement('board_teacher', seed % 2, 1),
        achievement('campus_guardian', seed % 25, 25),
      ],
      reactions: { bug: seed % 6, code: seed % 4, concept: seed % 8, patient: seed % 5 },
      health: await this.getHealth(),
    }
  },

  async getProfile() {
    await delay()
    const xp = levelFor(state.xp)
    const helps = Object.values(state.reactions).reduce((sum, count) => sum + count, 0)
    const hacker = mockHacker()
    return {
      login: ME.login,
      campusId: state.campusId,
      homeCampusId: ME.campusId,
      lang: null,
      // En la web de mentira se es admin, para poder ver el panel de gestión.
      admin: true,
      preReview: state.preReview,
      xp,
      // Como en la API: al pillar una trampa, el título se pone solo.
      title: hacker.title ?? state.title,
      hacks: hacker.caught,
      titles: [
        ...TITLES.map((title) => ({ ...title, unlocked: xp.level >= title.level })),
        ...(hacker.title === null ? [] : [{ id: hacker.title, level: 0, unlocked: true }]),
      ],
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
    if (settings.preReview !== undefined) state.preReview = settings.preReview

    const title = TITLES.find((candidate) => candidate.id === settings.title)

    if (title !== undefined) state.title = title.id
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
      declared,
    }
  },

  async declarePace(ref) {
    await delay(100)
    declared = { ...ref, circle: 3, updatedAt: new Date().toISOString() }

    return this.getHealth()
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
}
