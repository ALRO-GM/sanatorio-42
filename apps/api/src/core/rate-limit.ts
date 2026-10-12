/**
 * Tope de intentos por clave en una ventana de tiempo.
 *
 * Para lo que no tiene sesión y por tanto no pasa por el presupuesto de
 * peticiones: empezar un login, volver de 42, probar una clave de staff. La
 * clave suele ser la IP.
 *
 * Vive en memoria: con un solo proceso basta, y si se reinicia se pierde la
 * cuenta de una ventana, que es poco. El número de claves está acotado para que
 * nadie pueda llenar la memoria mandando peticiones desde muchas direcciones.
 */

export type RateLimit = {
  /** `true` si a esa clave le quedan intentos. No apunta nada. */
  allowed: (key: string) => boolean
  /** Apunta un intento. `false` si con este ya se pasa del tope. */
  hit: (key: string) => boolean
  /** Olvida los intentos de una clave (por ejemplo, tras acertar). */
  reset: (key: string) => void
  /** Segundos que faltan para que esa clave vuelva a tener intentos. */
  retryAfter: (key: string) => number
}

export function createRateLimit(options: {
  /** Intentos que caben en una ventana. */
  max: number
  windowMs: number
  /** Claves que se recuerdan a la vez. Al pasarse, se tiran las más antiguas. */
  maxKeys?: number
  now?: () => number
}): RateLimit {
  const { max, windowMs } = options
  const maxKeys = options.maxKeys ?? 10_000
  const now = options.now ?? Date.now
  const windows = new Map<string, { since: number; count: number }>()

  const live = (key: string): { since: number; count: number } | undefined => {
    const window = windows.get(key)

    if (window !== undefined && now() - window.since >= windowMs) {
      windows.delete(key)

      return undefined
    }

    return window
  }

  /** Hace sitio: primero lo caducado y, si no basta, lo más antiguo. */
  const prune = (): void => {
    for (const [key, window] of windows) {
      if (now() - window.since >= windowMs) windows.delete(key)
    }

    // Un `Map` recuerda el orden de inserción: el primero es el más antiguo.
    for (const key of windows.keys()) {
      if (windows.size < maxKeys) break
      windows.delete(key)
    }
  }

  return {
    allowed(key) {
      return (live(key)?.count ?? 0) < max
    },

    hit(key) {
      const window = live(key)

      if (window === undefined) {
        if (windows.size >= maxKeys) prune()
        windows.set(key, { since: now(), count: 1 })

        return max >= 1
      }

      window.count += 1

      return window.count <= max
    },

    reset(key) {
      windows.delete(key)
    },

    retryAfter(key) {
      const window = live(key)

      return window === undefined
        ? 0
        : Math.max(1, Math.ceil((window.since + windowMs - now()) / 1000))
    },
  }
}
