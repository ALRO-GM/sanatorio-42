/**
 * API de mentira: los topes por persona regulables desde el panel. Los valores
 * de fábrica y los márgenes son los de la API (`core/limits.ts`); el resto,
 * inventado y en memoria.
 */

import type {
  ActionLimit,
  ActionLimitKey,
  ActionLimits,
  ActionLimitUnit,
} from '@sanatorio/contracts'

import type { Api } from '../types'
import { delay, fail } from './state'

type Def = { default: number; min: number; max: number; unit: ActionLimitUnit }

const DEFS: Record<ActionLimitKey, Def> = {
  'messages.perMinute': { default: 20, min: 1, max: 200, unit: 'per_minute' },
  'messages.perMinuteChat': { default: 8, min: 1, max: 100, unit: 'per_minute' },
  'tickets.open': { default: 10, min: 1, max: 100, unit: 'at_once' },
  'tickets.per10Minutes': { default: 3, min: 1, max: 50, unit: 'per_10_minutes' },
  'suggestions.perDay': { default: 10, min: 1, max: 100, unit: 'per_day' },
  'brokenSeats.active': { default: 10, min: 1, max: 100, unit: 'at_once' },
  'doubts.perDay': { default: 10, min: 1, max: 100, unit: 'per_day' },
  'help.activeRequests': { default: 3, min: 1, max: 20, unit: 'at_once' },
  'therapy.openGroups': { default: 3, min: 1, max: 20, unit: 'at_once' },
  'boards.upcoming': { default: 5, min: 1, max: 50, unit: 'at_once' },
  'facility.perDay': { default: 10, min: 1, max: 100, unit: 'per_day' },
  'agenda.activeGoals': { default: 8, min: 1, max: 50, unit: 'at_once' },
  'countdowns.pins': { default: 12, min: 1, max: 50, unit: 'at_once' },
}

const KEYS = Object.keys(DEFS) as ActionLimitKey[]

/** Lo puesto a mano: `''` es todo el mundo. Con un ejemplo para la demo. */
const overrides = new Map<string, Map<ActionLimitKey, number>>([
  ['', new Map<ActionLimitKey, number>([['messages.perMinute', 25]])],
  ['mgarcia', new Map<ActionLimitKey, number>([['messages.perMinute', 5]])],
])

function view(login: string | null): ActionLimits {
  const limits: ActionLimit[] = KEYS.map((key) => {
    const def = DEFS[key]
    const global = overrides.get('')?.get(key) ?? null
    const user = login === null ? null : (overrides.get(login)?.get(key) ?? null)

    return { key, ...def, global, user, effective: user ?? global ?? def.default }
  })

  return {
    login,
    limits,
    people: [...overrides]
      .filter(([who, mine]) => who !== '' && mine.size > 0)
      .map(([who, mine]) => ({ login: who, count: mine.size }))
      .sort((a, b) => a.login.localeCompare(b.login)),
  }
}

const clean = (login: string | null): string | null =>
  login === null ? null : login.trim().toLowerCase()

export const actionLimitsMock: Pick<
  Api,
  'getActionLimits' | 'setActionLimit' | 'resetActionLimits'
> = {
  async getActionLimits(login) {
    await delay(80)

    return view(clean(login))
  },

  async setActionLimit(key, value, login) {
    await delay(120)

    const def = DEFS[key]

    if (value !== null && (!Number.isInteger(value) || value < def.min || value > def.max)) {
      throw fail(400, 'fuera de los márgenes de ese tope')
    }

    const who = clean(login) ?? ''
    const mine = overrides.get(who) ?? new Map<ActionLimitKey, number>()

    if (value === null) mine.delete(key)
    else mine.set(key, value)
    overrides.set(who, mine)

    return view(clean(login))
  },

  async resetActionLimits(login) {
    await delay(120)

    const who = clean(login) ?? ''

    overrides.delete(who)

    return view(who)
  },
}
