/**
 * Quién y qué provoca cada petición a 42.
 *
 * Cada petición de la web corre con su función (la sección: `network`,
 * `boards`…) y la persona de la sesión; cada trabajo de fondo, con la suya
 * (`job:…`, `sync:…`). El cliente de 42 lo mira al pedir, sin que nadie tenga
 * que pasarlo de mano en mano: va en un `AsyncLocalStorage`, que sigue a la
 * petición por todas sus promesas.
 */

import { AsyncLocalStorage } from 'node:async_hooks'

type ApiUse = {
  /** La función: sección de la web o trabajo de fondo. */
  feature: string
  /** Quién lo ha provocado, o `null` si es trabajo de fondo. */
  login: string | null
}

/**
 * Quien lleva la cuenta de las peticiones por función y por persona
 * (`replica/api-usage.ts`). Se engancha al cliente después de crearlo.
 */
export type ApiMeter = {
  /** Antes de pedir: lanza un `ApiError` si quien lo provoca ha llegado a su tope. */
  check: (endpoint: string) => void
  /** Cada intento que sale, reintentos incluidos. */
  count: () => void
}

const storage = new AsyncLocalStorage<ApiUse>()

/** Lo que está corriendo ahora, o `undefined` fuera de cualquier petición o trabajo. */
export function currentApiUse(): ApiUse | undefined {
  return storage.getStore()
}

/** Corre `run` a nombre de `use`, pase lo que pase fuera. */
export function withApiUse<T>(use: ApiUse, run: () => T): T {
  return storage.run(use, run)
}

/**
 * Corre `run` como trabajo de fondo de `feature`, salvo que ya vaya a nombre de
 * algo: una tarea de la copia que se lanza desde una visita (completar un
 * proyecto al abrir una pantalla) es de quien la ha abierto.
 */
export function inBackground<T>(feature: string, run: () => T): T {
  return storage.getStore() === undefined ? storage.run({ feature, login: null }, run) : run()
}
