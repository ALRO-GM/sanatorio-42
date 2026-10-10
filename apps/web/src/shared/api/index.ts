/**
 * La API que usa toda la web.
 *
 * Una sola variable de entorno decide si es la real o la de mentira
 * (`npm run dev:mock`).
 */

import { realApi } from './client'
import { mockApi } from './mock'
import type { Api } from './types'

export const api: Api = import.meta.env.VITE_USE_MOCK === 'true' ? mockApi : realApi

export { ApiError } from './http'
export type { Api, PeersResult } from './types'
