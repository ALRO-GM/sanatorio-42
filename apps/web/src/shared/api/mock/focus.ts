/**
 * API de mentira: el Pomodoro de quien mira.
 */

import type { Focus, FocusSettings } from '@sanatorio/contracts'

import { delay } from './state'
import type { Api } from '../types'

const DEFAULTS: FocusSettings = {
  focusMinutes: 25,
  breakMinutes: 5,
  sections: ['calendario', 'expediente'],
  show: ['corrections', 'events'],
}

let state: Focus = { until: null, startedAt: null, settings: DEFAULTS }

export const focusMock: Pick<Api, 'getFocus' | 'startFocus' | 'stopFocus'> = {
  async getFocus() {
    await delay(60)

    if (state.until !== null && Date.parse(state.until) <= Date.now()) {
      state = { ...state, until: null, startedAt: null }
    }

    return { ...state }
  },
  async startFocus(settings) {
    await delay(100)

    const now = Date.now()

    state = {
      settings,
      startedAt: new Date(now).toISOString(),
      until: new Date(now + settings.focusMinutes * 60_000).toISOString(),
    }

    return { ...state }
  },
  async stopFocus() {
    await delay(80)
    state = { ...state, until: null, startedAt: null }

    return { ...state }
  },
}
