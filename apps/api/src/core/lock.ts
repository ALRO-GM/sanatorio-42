/**
 * Una cosa cada vez por clave (una sala, por ejemplo): las peticiones sobre la
 * misma clave esperan su turno, para que dos no cambien el mismo estado a la
 * vez. Vale porque la API es un solo proceso.
 */
export function createLocks() {
  const locks = new Map<number | string, Promise<unknown>>()

  return async function locked<T>(key: number | string, run: () => Promise<T>): Promise<T> {
    const before = locks.get(key) ?? Promise.resolve()
    const next = before.then(run, run)

    locks.set(
      key,
      next.catch(() => undefined),
    )

    try {
      return await next
    } finally {
      if (locks.get(key) === next) locks.delete(key)
    }
  }
}
