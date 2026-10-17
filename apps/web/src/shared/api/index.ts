/**
 * La API que usa toda la web.
 *
 * Una sola variable de entorno decide si es la real o la de mentira
 * (`npm run dev:mock`).
 */

import { realApi } from './client'
import type { Api } from './types'

// La de mentira se importa solo si se va a usar: así sus datos de ejemplo no
// viajan en la web de verdad. El `await` de módulo retrasa el arranque lo que
// tarda en llegar ese trozo, y solo en `dev:mock`.
export const api: Api =
  import.meta.env.VITE_USE_MOCK === 'true' ? (await import('./mock')).mockApi : realApi

export { ApiError } from './http'
export { photoUrl } from './photos'
