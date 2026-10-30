/**
 * La piscina en la API simulada: el aviso de la piscina cerrada, sus ajustes y
 * lo que puede ver quien ha entrado. Con `localStorage.mock_pool = 'true'` se
 * entra como piscinero, para ver la web como la vería uno. La vista de
 * piscinero del panel lo hace con `mock_pool_preview`, como la cookie de verdad.
 */

import type { PoolKey, PoolSettings } from '@sanatorio/contracts'

import type { Api } from '../types'
import { delay, fail } from './state'

/** Lo mismo que `POOL_DEFAULT` de la API. */
const DEFAULT: PoolKey[] = [
  'expediente',
  'expediente.achievements',
  'agenda',
  'agenda.sprint',
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

const PREVIEW = 'mock_pool_preview'
/** La vista sin límites del dueño: `'full'` en la misma clave. */
const FULL = 'full'

/** Si quien administra está en la vista de piscinero: entonces no administra. */
export const poolPreviewing = (): boolean => {
  const value = localStorage.getItem(PREVIEW)

  return value === 'true' || value === FULL
}

/** Si se está viendo la web como piscinero (`mock_pool` o la vista previa): entonces, la piscina. */
export const poolMocking = (): boolean =>
  poolPreviewing() || localStorage.getItem('mock_pool') === 'true'

export const poolMock: Pick<
  Api,
  | 'getPoolNotice'
  | 'getPoolSettings'
  | 'updatePoolSettings'
  | 'getPoolAccess'
  | 'startPoolPreview'
  | 'stopPoolPreview'
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

    if (localStorage.getItem(PREVIEW) === FULL) {
      return { pool: true, allow: null, preview: true, unrestricted: true }
    }
    if (poolPreviewing()) return { pool: true, allow: effective(settings.allow), preview: true }

    // En la de mentira entra `albrodri`, el dueño.
    return poolMocking()
      ? { pool: true, allow: effective(settings.allow) }
      : { pool: false, allow: null, owner: true }
  },
  async startPoolPreview(full = false) {
    await delay(40)
    localStorage.setItem(PREVIEW, full ? FULL : 'true')
  },
  async stopPoolPreview() {
    await delay(40)
    // Como la API: sin estar en la vista, no hay de dónde volver.
    if (!poolPreviewing()) throw fail(403, 'No estás en la vista de piscinero')
    localStorage.removeItem(PREVIEW)
  },
}
