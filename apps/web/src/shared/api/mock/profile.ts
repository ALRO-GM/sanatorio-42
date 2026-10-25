/**
 * API de mentira: expediente, preferencias, estado de salud y ranking.
 */

import { mockHacker } from './clicker'
import type { PaceRef, TitleId } from '@sanatorio/contracts'

import { LEVEL_FLOORS, ME, RANKING, TITLES } from './data'
import { poolPreviewing } from './pool'
import { portrait } from './portrait'
import type { Api } from '../types'
import { AVAILABLE_KEY, state, delay, fail, levelFor, achievement } from './state'

/** Lo que se anota en la tarjeta de salud: dura lo que dure la pestaña. */
// Con `?pace=riesgo`, un pace 24 a diez días del plazo: sale el tope de Code Clicker.
let declared: PaceRef | null =
  new URLSearchParams(window.location.search).get('pace') === 'riesgo'
    ? {
        pace: 24,
        circle: 3,
        deadline: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10),
        updatedAt: new Date().toISOString(),
      }
    : null

/**
 * El título de alguien de mentira, siempre el mismo: sale de su login. Unos
 * cuantos lucen uno de los especiales, para que en la demo se vean sus banners.
 */
function mockTitleOf(login: string): TitleId {
  const special: Record<string, TitleId> = {
    mgarcia: 'maestro',
    jdoe: 'hacker_etico',
    lruiz: 'hacker_cazado',
  }
  const seed = Array.from(login).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const level = LEVEL_FLOORS.filter((floor) => 40 + (seed % 9) * 85 >= floor).length

  return (
    special[login] ?? [...TITLES].reverse().find((entry) => level >= entry.level)?.id ?? 'paciente'
  )
}

/**
 * Las trampas pilladas cuando se eligió título a mano. Como en la API, una
 * trampa nueva pone sola su título; hasta entonces, manda lo elegido.
 */
const picked: { caught: number | null } = { caught: null }

/** Con qué estilo ven los demás el expediente de la persona de mentira. */
const recordStyle: { current: string | null } = { current: null }

export const profileMock: Pick<
  Api,
  | 'getPublicProfile'
  | 'getPersonCard'
  | 'getProfile'
  | 'updateSettings'
  | 'getHealth'
  | 'declarePace'
  | 'getLeaderboard'
> = {
  async getPersonCard(login) {
    await delay(120)

    // Logins inventados con un puesto y proyectos que cambian según el nombre.
    const n = Array.from({ length: login.length }, (_, i) => login.charCodeAt(i)).reduce(
      (sum, code) => sum + code,
      0,
    )
    const seated = n % 3 !== 0

    return {
      login,
      image: portrait(login),
      seat: seated ? `c${(n % 4) + 1}r${(n % 9) + 1}s${(n % 7) + 1}` : null,
      circle: n % 5,
      projects: [['ft_printf', 'get_next_line'], ['push_swap'], ['minishell'], []][n % 4] ?? [],
      onDuty: seated && n % 2 === 0,
      online: n % 2 === 1,
      me: login === ME.login,
      focusUntil: login === 'lsoto' ? new Date(Date.now() + 20 * 60_000).toISOString() : null,
      title: login === ME.login ? (await this.getProfile()).title : mockTitleOf(login),
    }
  },

  async getPublicProfile(login) {
    await delay()

    // Cada quien con un nivel distinto, siempre el mismo: sale de su login.
    const seed = Array.from(login).reduce((sum, char) => sum + char.charCodeAt(0), 0)
    const total = 40 + (seed % 9) * 85
    const level = LEVEL_FLOORS.filter((floor) => total >= floor).length

    return {
      login,
      hacks: 0,
      master: 0,
      // Alguien de mentira que enseña su expediente con su estilo: así se ve en la demo.
      recordStyle: login === 'mgarcia' ? 'espacio' : null,
      image: portrait(login),
      xp: {
        total,
        level,
        floor: LEVEL_FLOORS[level - 1] ?? 0,
        next: LEVEL_FLOORS[level] ?? null,
      },
      title: mockTitleOf(login),
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
      // En la web de mentira se es admin, para poder ver el panel de gestión;
      // en la vista de piscinero, no, como en la API.
      admin: !poolPreviewing(),
      preReview: state.preReview,
      recordStyle: recordStyle.current,
      xp,
      // Como en la API: al pillar una trampa, el título se pone solo.
      title: hacker.title !== null && picked.caught !== hacker.caught ? hacker.title : state.title,
      hacks: hacker.caught,
      // Maestro del código en un proyecto (Libft), como en el grafo de mentira.
      master: 1,
      titles: [
        ...TITLES.map((title) => ({ ...title, unlocked: xp.level >= title.level })),
        ...(hacker.title === null ? [] : [{ id: hacker.title, level: 0, unlocked: true }]),
        { id: 'maestro' as const, level: 0, unlocked: true },
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
    if (settings.recordStyle !== undefined) {
      recordStyle.current =
        settings.recordStyle === 'none' || settings.recordStyle === 'default'
          ? null
          : settings.recordStyle
    }

    if (settings.title === undefined) return

    // Como en la API: solo uno que ya tengas (el maestro, en la demo, siempre).
    const { titles } = await this.getProfile()
    const title = titles.find((entry) => entry.id === settings.title && entry.unlocked)

    if (title === undefined) throw fail(403, 'Ese título todavía no lo has desbloqueado')
    state.title = title.id
    picked.caught = mockHacker().caught
  },

  async getHealth() {
    await delay()

    // Alguien en el círculo 3 que empezó hace 146 días: ya no llega a pace 12.
    const start = Date.now() - 146 * 86_400_000
    const at = (days: number): string => new Date(start + days * 86_400_000).toISOString()

    return {
      startedAt: at(0),
      blackholedAt: at(320),
      // Como el Avance de mentira: tu plan es el de Python.
      track: 'next' as const,
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
