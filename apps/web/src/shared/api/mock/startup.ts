import type { StartupRankRow } from '@sanatorio/contracts'
import { EMPTY_STARTUP, act, focusOf, stageOf, valuationOf } from '@sanatorio/startup'
import type { StartupState } from '@sanatorio/startup'

import type { Api } from '../types'
import { ME } from './data'
import { delay, fail } from './state'

/**
 * La startup de mentira: con 30 horas de concentración ya hechas, para poder
 * comprar, fundar y contratar; y un ranking con logins inventados.
 */
const EARNED = 30 * 60
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

export const startupMock: Pick<Api, 'getStartup' | 'startupAction' | 'getStartupRanking'> = {
  async getStartup() {
    await delay(120)

    return { login: ME.login, state: mine, earnedMinutes: EARNED }
  },

  async startupAction(action) {
    await delay(120)

    const result = act(ME.login, mine, EARNED, action)

    if ('refused' in result) throw fail(409, 'Eso aún no se puede')
    mine = result.state

    return { login: ME.login, state: mine, earnedMinutes: EARNED }
  },

  async getStartupRanking() {
    await delay(120)

    const me: StartupRankRow = {
      login: ME.login,
      name: mine.name,
      hours: EARNED / 60,
      valuation: valuationOf(mine),
      stage: stageOf(mine),
      focus: focusOf(mine),
      team: mine.team.length,
    }

    return [...OTHERS, me].sort((a, b) => b.hours - a.hours || b.valuation - a.valuation)
  },
}
