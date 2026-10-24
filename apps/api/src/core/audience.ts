/**
 * Quién ve a quién (`docs/piscineros.md`): mundos separados. Un estudiante no
 * ve a ningún piscinero; un piscinero solo ve a los piscineros de su campus.
 * Los servicios que enseñan gente la pasan por aquí.
 */

import type { Actor } from './actor.js'

export type Audience = {
  /** Los logins (en minúsculas) de los piscineros en curso de un campus. */
  poolIn: (campusId: number) => Promise<ReadonlySet<string>>
}

/** Lo leído de cada campus vale este rato. */
const TTL_MS = 60_000

export function createAudience(
  read: (campusId: number) => Promise<readonly string[]>,
  now: () => number = Date.now,
): Audience {
  const cache = new Map<number, { at: number; logins: Promise<ReadonlySet<string>> }>()

  return {
    poolIn(campusId) {
      const hit = cache.get(campusId)

      if (hit !== undefined && now() - hit.at < TTL_MS) return hit.logins

      const logins = read(campusId).then(
        (list) => new Set(list.map((login) => login.toLowerCase())) as ReadonlySet<string>,
      )

      cache.set(campusId, { at: now(), logins })
      logins.catch(() => cache.delete(campusId))

      return logins
    },
  }
}

/** Nadie es piscinero: para los tests y lo que aún no separa. */
export const NO_POOL: Audience = { poolIn: () => Promise.resolve(new Set()) }

/**
 * Si quien pregunta puede ver a cada login: devuelve la comprobación, ya con
 * los piscineros de su campus leídos.
 */
export async function seesFor(
  audience: Audience,
  actor: Pick<Actor, 'campusId' | 'pool'>,
): Promise<(login: string) => boolean> {
  const pool = await audience.poolIn(actor.campusId)

  return actor.pool === true
    ? (login) => pool.has(login.toLowerCase())
    : (login) => !pool.has(login.toLowerCase())
}
