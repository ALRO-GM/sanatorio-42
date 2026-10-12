/// <reference types="vite/client" />

// `interface` y no `type`: es la forma de ampliar los tipos globales de Vite.
/* eslint-disable @typescript-eslint/consistent-type-definitions */

interface ImportMetaEnv {
  /** Dónde está la API. Por defecto, `/api`. */
  readonly VITE_API_URL?: string
  /** `true` para usar la API de mentira en memoria. */
  readonly VITE_USE_MOCK?: string
  /** Con la API de mentira: empezar con la sesión iniciada. */
  readonly VITE_MOCK_LOGGED_IN?: string
  /** `true` en la web de demostración pública (`/demo/`). */
  readonly VITE_DEMO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
