/**
 * Memoria de resultados caros, con caducidad y tope de tamaño.
 *
 * Para cuentas que salen de la base y cambian despacio (un agregado sobre miles
 * de filas): varias peticiones seguidas comparten el mismo resultado en vez de
 * repetir la consulta. Si dos piden lo mismo a la vez, la segunda espera a la
 * primera en vez de lanzar otra consulta igual.
 */

export type TtlCache<T> = {
  /** El valor de `key`: el guardado si sigue vigente; si no, el que dé `load`. */
  get: (key: string, load: () => Promise<T>) => Promise<T>
  /** Olvida todo. */
  clear: () => void
}

export function createTtlCache<T>(options: {
  ttlMs: number
  /** Entradas que se recuerdan a la vez. Al pasarse, se tira la más antigua. */
  maxEntries: number
  now?: () => number
}): TtlCache<T> {
  const { ttlMs, maxEntries } = options
  const now = options.now ?? Date.now
  const entries = new Map<string, { at: number; value: Promise<T> }>()

  return {
    get(key, load) {
      const known = entries.get(key)

      if (known !== undefined && now() - known.at < ttlMs) {
        return known.value
      }

      const value = load()

      // Un `Map` recuerda el orden de inserción: borrar y volver a poner manda
      // la entrada al final, así que la primera es siempre la más antigua.
      entries.delete(key)
      entries.set(key, { at: now(), value })

      if (entries.size > maxEntries) {
        const oldest = entries.keys().next().value

        if (oldest !== undefined) {
          entries.delete(oldest)
        }
      }

      // Un fallo no se queda guardado: la siguiente petición lo vuelve a intentar.
      value.catch(() => {
        if (entries.get(key)?.value === value) {
          entries.delete(key)
        }
      })

      return value
    },

    clear() {
      entries.clear()
    },
  }
}
