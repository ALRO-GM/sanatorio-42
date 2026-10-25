/**
 * Quién ve a quién (`docs/piscineros.md`): mundos separados. Un estudiante no
 * ve a ningún piscinero; un piscinero solo ve a los piscineros de su campus.
 * Además, quien administra puede ocultar a alguien a los estudiantes, a los
 * piscineros o a los dos (`docs/personas-ocultas.md`): para ese grupo no
 * existe. Los servicios que enseñan gente la pasan por aquí.
 */

import type { Actor } from './actor.js'

export type Audience = {
  /** Los logins (en minúsculas) de los piscineros en curso de un campus. */
  poolIn: (campusId: number) => Promise<ReadonlySet<string>>
  /** Los logins (en minúsculas) ocultos a los piscineros (`true`) o a los estudiantes. */
  hiddenFrom: (pool: boolean) => Promise<ReadonlySet<string>>
  /** Olvida lo leído de los ocultos: se llama al cambiar la lista en el panel. */
  forget: () => void
  /**
   * Cuántas veces ha cambiado la lista de ocultos. Lo que se guarda ya
   * filtrado (la red de correcciones, la de asientos) lo lleva en la clave.
   */
  version: () => number
}

/** Quien mira: su campus, su grupo y, si se sabe, su login (se ve siempre a sí mismo). */
type Viewer = Pick<Actor, 'campusId' | 'pool'> & { login?: string }

/** Lo leído de cada campus vale este rato. */
const TTL_MS = 60_000
/** Los ocultos, menos: el panel además lo olvida al cambiarlos. */
const HIDDEN_TTL_MS = 30_000

const lowered = (list: readonly string[]): ReadonlySet<string> =>
  new Set(list.map((login) => login.toLowerCase()))

export function createAudience(
  read: (campusId: number) => Promise<readonly string[]>,
  now: () => number = Date.now,
  readHidden: (pool: boolean) => Promise<readonly string[]> = () => Promise.resolve([]),
): Audience {
  const cache = new Map<number, { at: number; logins: Promise<ReadonlySet<string>> }>()
  const hidden = new Map<boolean, { at: number; logins: Promise<ReadonlySet<string>> }>()
  let changes = 0

  return {
    poolIn(campusId) {
      const hit = cache.get(campusId)

      if (hit !== undefined && now() - hit.at < TTL_MS) return hit.logins

      const logins = read(campusId).then(lowered)

      cache.set(campusId, { at: now(), logins })
      logins.catch(() => cache.delete(campusId))

      return logins
    },
    hiddenFrom(pool) {
      const hit = hidden.get(pool)

      if (hit !== undefined && now() - hit.at < HIDDEN_TTL_MS) return hit.logins

      const logins = readHidden(pool).then(lowered)

      hidden.set(pool, { at: now(), logins })
      logins.catch(() => hidden.delete(pool))

      return logins
    },
    forget() {
      hidden.clear()
      changes += 1
    },
    version: () => changes,
  }
}

/** Nadie es piscinero ni está oculto: para los tests y lo que aún no separa. */
export const NO_POOL: Audience = {
  poolIn: () => Promise.resolve(new Set()),
  hiddenFrom: () => Promise.resolve(new Set()),
  forget: () => undefined,
  version: () => 0,
}

/**
 * Si quien pregunta puede ver a cada login: devuelve la comprobación, ya con
 * los piscineros de su campus y los ocultos a su grupo leídos. A sí mismo se
 * ve siempre, aunque esté oculto.
 */
export async function seesFor(
  audience: Audience,
  actor: Viewer,
): Promise<(login: string) => boolean> {
  const [pool, hidden] = await Promise.all([
    audience.poolIn(actor.campusId),
    audience.hiddenFrom(actor.pool === true),
  ])
  const self = actor.login?.toLowerCase()

  return (login) => {
    const wanted = login.toLowerCase()

    if (wanted === self) return true
    if (hidden.has(wanted)) return false

    return actor.pool === true ? pool.has(wanted) : !pool.has(wanted)
  }
}

/**
 * Solo los ocultos, sin separar mundos: para lo que es de todos los campus y
 * ya mezcla grupos (la clasificación de Code Clicker).
 */
export async function shownFor(
  audience: Audience,
  actor: Viewer,
): Promise<(login: string) => boolean> {
  const hidden = await audience.hiddenFrom(actor.pool === true)
  const self = actor.login?.toLowerCase()

  return (login) => login.toLowerCase() === self || !hidden.has(login.toLowerCase())
}

/**
 * Lo que distingue una vista ya filtrada para guardarla: la versión de los
 * ocultos y, si quien mira está oculto a su grupo, su login (él se ve; los
 * demás de su grupo, no).
 */
export async function audienceKey(audience: Audience, actor: Viewer): Promise<string> {
  const hidden = await audience.hiddenFrom(actor.pool === true)
  const self = actor.login?.toLowerCase() ?? ''

  return `${String(audience.version())}${hidden.has(self) ? `|${self}` : ''}`
}

/** Lo de una lista que es de gente que quien pregunta puede ver (salas, grupos, pizarras…). */
export async function visibleTo<T>(
  audience: Audience,
  actor: Viewer,
  items: readonly T[],
  loginOf: (item: T) => string,
): Promise<T[]> {
  const sees = await seesFor(audience, actor)

  return items.filter((item) => sees(loginOf(item)))
}
