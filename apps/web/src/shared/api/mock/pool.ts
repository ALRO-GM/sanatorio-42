/**
 * La piscina en la API simulada: el aviso de la piscina cerrada y sus ajustes.
 */

import type { PoolSettings } from '@sanatorio/contracts'

import type { Api } from '../types'
import { delay } from './state'

let settings: PoolSettings = { open: false, message: '' }

export const poolMock: Pick<Api, 'getPoolNotice' | 'getPoolSettings' | 'updatePoolSettings'> = {
  async getPoolNotice() {
    await delay(40)

    return { message: settings.message }
  },
  async getPoolSettings() {
    await delay(60)

    return { ...settings }
  },
  async updatePoolSettings(changes) {
    await delay(80)
    settings = { ...settings, message: changes.message.trim() }

    return { ...settings }
  },
}
