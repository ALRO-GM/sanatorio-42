import type { StartupRankRow } from '@sanatorio/contracts'
import { EMPTY_STARTUP, act, focusOf, stageOf, valuationOf } from '@sanatorio/startup'
import type { StartupState } from '@sanatorio/startup'

import type { Api } from '../types'
import { ME } from './data'
import { delay, fail } from './state'

/**
 * La startup de mentira: con 30 horas de concentración ya hechas y tres
 * sesiones largas (tres cajas sorpresa), para poder comprar, fundar, contratar
 * y decorar. Mientras se mira, cada segundo cuenta como un minuto más de
 * concentración, para ver crecer el dinero. Y un ranking con logins
 * inventados, con su oficina para ir a verla.
 */
const START = Date.now()
const earned = (): number => 30 * 60 + Math.floor((Date.now() - START) / 1000)
const LONG_SESSIONS = 3
let mine: StartupState = { ...EMPTY_STARTUP }

const OTHERS: StartupRankRow[] = [
  {
    login: 'lmarin-g',
    name: 'Nubesur',
    hours: 142.5,
    valuation: 18_400_000,
    stage: 5,
    focus: 'infra',
    team: 14,
  },
  {
    login: 'pvidal-r',
    name: 'Datalia',
    hours: 96,
    valuation: 2_150_000,
    stage: 4,
    focus: 'data',
    team: 6,
  },
  {
    login: 'ateru-mo',
    name: 'Pixelia',
    hours: 61.2,
    valuation: 640_000,
    stage: 3,
    focus: 'front',
    team: 2,
  },
  { login: 'jcasa-lo', name: null, hours: 22, valuation: 41_000, stage: 2, focus: 'ai', team: 0 },
  { login: 'mrios-ba', name: null, hours: 7.5, valuation: 6_000, stage: 1, focus: 'back', team: 0 },
]

/** La oficina de cada startup inventada, a juego con su fila del ranking. */
function officeOf(row: StartupRankRow): StartupState {
  const axis = row.focus ?? 'front'
  const space = Math.min(5, Math.max(0, row.stage - 1))

  return {
    ...EMPTY_STARTUP,
    name: row.name,
    levels: {
      [`learn-${axis}`]: 5,
      computer: Math.min(5, row.stage),
      space,
      servers: row.stage,
      'product-bot': 1,
      ...(space >= 4 ? { floors: 2, basement: 1, solar: 1, rooftop: 1 } : {}),
    },
    milestones: (['side', 'mvp', 'founded'] as const).slice(0, Math.min(3, row.stage)),
    team: Array.from({ length: row.team }, (_, index) =>
      index % 4 === 3
        ? { axis, stars: 1, look: (index * 211) % 1000, role: 'cleaning' as const }
        : { axis, stars: 1 + (index % 3), look: (index * 137) % 1000 },
    ),
    decor: [
      { id: 'plant', at: [0, 2], turn: false },
      { id: 'rug', at: [2, 2], turn: false },
      { id: 'cat', at: null, turn: false },
    ],
  }
}

export const startupMock: Pick<
  Api,
  'getStartup' | 'startupAction' | 'getStartupRanking' | 'getStartupOffice'
> = {
  async getStartup() {
    await delay(120)

    return { login: ME.login, state: mine, earnedMinutes: earned(), longSessions: LONG_SESSIONS }
  },

  async startupAction(action) {
    await delay(120)

    const result = act(ME.login, mine, earned(), action, LONG_SESSIONS)

    if ('refused' in result) throw fail(409, 'Eso aún no se puede')
    mine = result.state

    return { login: ME.login, state: mine, earnedMinutes: earned(), longSessions: LONG_SESSIONS }
  },

  async getStartupRanking() {
    await delay(120)

    const me: StartupRankRow = {
      login: ME.login,
      name: mine.name,
      hours: Math.round((earned() / 60) * 10) / 10,
      valuation: valuationOf(mine),
      stage: stageOf(mine),
      focus: focusOf(mine),
      team: mine.team.length,
    }

    return [...OTHERS, me].sort((a, b) => b.hours - a.hours || b.valuation - a.valuation)
  },

  async getStartupOffice(login) {
    await delay(120)

    if (login === ME.login) return { login, state: mine }

    const row = OTHERS.find((one) => one.login === login)

    if (row === undefined) throw fail(404, 'No hay startup')

    return { login, state: officeOf(row) }
  },
}
