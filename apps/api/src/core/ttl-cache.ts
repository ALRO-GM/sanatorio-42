/**
 * Memoria de resultados caros, con caducidad y tope de tamaño.
 *
 * Para cuentas que salen de la base y cambian despacio (un agregado sobre miles
 * de filas): varias peticiones seguidas comparten el mismo resultado en vez de
 * repetir la consulta. Si dos piden lo mismo a la vez, la segunda espera a la
 * primera en vez de lanzar otra consulta igual.
 *
 * Con `staleMs`, lo caducado se sigue dando durante ese rato mientras se rehace
 * de fondo: quien pregunta no espera al cálculo entero, solo lo ve un poco viejo.
 */

import { clockOf } from './options.js'
import type { Clock } from './options.js'

type TtlCache<T> = {
  /** El valor de `key`: el guardado si sigue vigente; si no, el que dé `load`. */
  get: (key: string, load: () => Promise<T>) => Promise<T>
  /** Olvida todo. */
  clear: () => void
}

export function createTtlCache<T>(
  options: Clock & {
    ttlMs: number
    /** Entradas que se recuerdan a la vez. Al pasarse, se tira la más antigua. */
    maxEntries: number
    /** Lo que se sigue dando lo caducado, mientras se rehace de fondo. Sin él, nada. */
    staleMs?: number
  },
): TtlCache<T> {
  const { ttlMs, maxEntries, staleMs = 0 } = options
  const now = clockOf(options)
  type Entry = { at: number; value: Promise<T>; ready: boolean; refreshing: boolean }
  const entries = new Map<string, Entry>()

  /** Guarda `value` en `key`: al resolverse queda listo; si falla, se olvida. */
  function store(key: string, value: Promise<T>): void {
    const entry: Entry = { at: now(), value, ready: false, refreshing: false }

    // Un `Map` recuerda el orden de inserción: borrar y volver a poner manda
    // la entrada al final, así que la primera es siempre la más antigua.
    entries.delete(key)
    entries.set(key, entry)

    if (entries.size > maxEntries) {
      const oldest = entries.keys().next().value

      if (oldest !== undefined) {
        entries.delete(oldest)
      }
    }

    value.then(
      () => {
        entry.ready = true
      },
      // Un fallo no se queda guardado: la siguiente petición lo vuelve a intentar.
      () => {
        if (entries.get(key) === entry) {
          entries.delete(key)
        }
      },
    )
  }

  return {
    get(key, load) {
      const known = entries.get(key)
      const age = known === undefined ? Infinity : now() - known.at

      if (known !== undefined && age < ttlMs) {
        return known.value
      }

      // Caducado pero aún servible: se da lo de antes y se rehace de fondo, una vez.
      if (known?.ready === true && age < ttlMs + staleMs) {
        if (!known.refreshing) {
          known.refreshing = true

          let next: Promise<T>

          try {
            next = load()
          } catch {
            // Un tope (`rate_limited`) que salta antes de empezar: se sigue con lo de antes.
            known.refreshing = false

            return known.value
          }

          next.then(
            () => {
              if (entries.get(key) === known) store(key, next)
            },
            () => {
              known.refreshing = false
            },
          )
        }

        return known.value
      }

      const value = load()

      store(key, value)

      return value
    },

    clear() {
      entries.clear()
    },
  }
}
