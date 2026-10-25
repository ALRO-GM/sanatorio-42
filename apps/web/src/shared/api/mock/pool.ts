/**
 * La piscina en la API simulada: el aviso de la piscina cerrada, sus ajustes y
 * lo que puede ver quien ha entrado. Con `localStorage.mock_pool = 'true'` se
 * entra como piscinero, para ver la web como la vería uno.
 */

import type { PoolKey, PoolSettings } from '@sanatorio/contracts'

import type { Api } from '../types'
import { delay } from './state'

/** Lo mismo que `POOL_DEFAULT` de la API. */
const DEFAULT: PoolKey[] = [
  'expediente',
  'expediente.achievements',
  'consulta',
  'consulta.map',
  'guardia',
  'tablon',
  'terapia',
  'pizarras',
  'calendario',
  'clusters',
  'clusters.report',
  'red',
  'red.seats',
  'focus',
  'mailbox',
  'people',
  'broadcasts',
  'tickets',
]

let settings: PoolSettings = { open: false, message: '', allow: [...DEFAULT] }

/** Un elemento solo vale con su pestaña, como en la API. */
const effective = (allow: readonly PoolKey[]): PoolKey[] =>
  allow.filter((key) => allow.includes(key.split('.')[0] as PoolKey))

export const poolMock: Pick<
  Api,
  'getPoolNotice' | 'getPoolSettings' | 'updatePoolSettings' | 'getPoolAccess'
> = {
  async getPoolNotice() {
    await delay(40)

    return { message: settings.message }
  },
  async getPoolSettings() {
    await delay(60)

    return { ...settings, allow: [...settings.allow] }
  },
  async updatePoolSettings(changes) {
    await delay(80)
    settings = {
      open: changes.open ?? settings.open,
      message: changes.message === undefined ? settings.message : changes.message.trim(),
      allow: changes.allow === undefined ? settings.allow : [...new Set(changes.allow)],
    }

    return { ...settings, allow: [...settings.allow] }
  },
  async getPoolAccess() {
    await delay(40)

    return localStorage.getItem('mock_pool') === 'true'
      ? { pool: true, allow: effective(settings.allow) }
      : { pool: false, allow: null }
  },
}
