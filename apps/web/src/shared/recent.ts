/**
 * Las últimas personas buscadas, para volver a ellas sin escribir. Se guardan en
 * el navegador, cada buscador en su lista (la cabecera y la Red), y solo
 * importan aquí: si el navegador no deja guardar, simplemente no hay recientes.
 */

/** Cuántas se recuerdan por buscador. */
export const RECENT_MAX = 8

export type RecentPerson = { login: string; image: string | null }

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const keyOf = (list: string): string => `sanatorio_recent_${list}`

function storage(): Store | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Las recientes de un buscador, la última primero. */
export function recentOf(list: string, store: Store | null = storage()): RecentPerson[] {
  try {
    const parsed: unknown = JSON.parse(store?.getItem(keyOf(list)) ?? '[]')

    return Array.isArray(parsed)
      ? parsed
          .filter(
            (entry): entry is RecentPerson =>
              typeof entry === 'object' &&
              entry !== null &&
              typeof (entry as RecentPerson).login === 'string' &&
              /^[a-z0-9-]{1,40}$/.test((entry as RecentPerson).login),
          )
          .map((entry) => ({
            login: entry.login,
            image: typeof entry.image === 'string' ? entry.image : null,
          }))
          .slice(0, RECENT_MAX)
      : []
  } catch {
    return []
  }
}

/** Apunta a alguien arriba del todo (sin repetirlo) y devuelve la lista. */
export function remember(
  list: string,
  person: RecentPerson,
  store: Store | null = storage(),
): RecentPerson[] {
  const next = [
    person,
    ...recentOf(list, store).filter((entry) => entry.login !== person.login),
  ].slice(0, RECENT_MAX)

  try {
    store?.setItem(keyOf(list), JSON.stringify(next))
  } catch {
    // Sin sitio o sin permiso: se queda sin recientes, y no pasa nada.
  }

  return next
}

/** Olvida las recientes de un buscador. */
export function forget(list: string, store: Store | null = storage()): void {
  try {
    store?.removeItem(keyOf(list))
  } catch {
    // Lo mismo.
  }
}
