/**
 * La API que usa toda la web.
 *
 * Una sola variable de entorno decide si es la real o la de mentira
 * (`npm run dev:mock`).
 */

import { withUnlockChecks } from '../unlocks'
import { realApi } from './client'
import type { Api } from './types'

// La de mentira se importa solo si se va a usar: así sus datos de ejemplo no
// viajan en la web de verdad. El `await` de módulo retrasa el arranque lo que
// tarda en llegar ese trozo, y solo en `dev:mock`. Las dos, avisando de mirar
// lo desbloqueado tras cada punto superado de un curso (`shared/unlocks.ts`).
export const api: Api = withUnlockChecks(
  import.meta.env.VITE_USE_MOCK === 'true' ? (await import('./mock')).mockApi : realApi,
)

export { ApiError, onMaintenance } from './http'
export { photoUrl } from './photos'
