/**
 * Datos de 42 de mentira, con la forma que devuelve la API de verdad.
 *
 * Los usan los tests de la réplica, del sincronizador y de integración. Tenerlos
 * en un sitio evita que cada test invente su propia versión de una fila de
 * `projects_users` y que alguna se olvide de un campo que el código sí lee.
 */

import type {
  ApiLocation,
  ApiProjectUser,
  ApiUser,
} from '../../src/integrations/forty-two/types.js'

/** Ids estables por login, para que la misma persona sea la misma en todos los tests. */
const USER_IDS: Record<string, number> = { albrodri: 1, jdoe: 2, mgomez: 3, lruiz: 4, tvega: 5 }

/** Id de una persona. Los logins que no están en la tabla reciben uno derivado. */
export function userId(login: string): number {
  const known = USER_IDS[login]

  if (known !== undefined) {
    return known
  }

  // Posicional, para que `u1` y `u10` (o dos anagramas) no acaben con el mismo id.
  let hash = 0

  for (let index = 0; index < login.length; index += 1) {
    hash = (hash * 31 + login.charCodeAt(index)) % 1_000_000
  }

  return 1000 + hash
}

/**
 * Una persona como viene anidada en la API, con los campos que **no** se deben
 * guardar (`email`, `wallet`…) para poder comprobar que se quedan fuera.
 */
export function apiUser(login: string, overrides: Partial<ApiUser> = {}): ApiUser {
  return {
    id: userId(login),
    login,
    usual_full_name: `${login} de Pruebas`,
    image: {
      link: `https://img/${login}.png`,
      versions: {
        medium: `https://img/${login}-medium.png`,
        small: `https://img/${login}-small.png`,
      },
    },
    'active?': true,
    ...({ email: `${login}@student.42madrid.com`, wallet: 123, correction_point: 4 } as object),
    ...overrides,
  }
}

let nextRowId = 1

/** Una fila de `projects_users`. */
export function projectUser(
  login: string,
  options: {
    projectId?: number
    projectName?: string
    slug?: string
    /** Cursus de la fila. Por defecto, el 42cursus (`21`). */
    cursusIds?: number[]
    /** Cuándo se apuntó al proyecto. */
    createdAt?: string
    status?: string
    validated?: boolean | null
    updatedAt?: string
    id?: number
    user?: Partial<ApiUser>
  } = {},
): ApiProjectUser {
  const status = options.status ?? 'in_progress'

  return {
    id: options.id ?? nextRowId++,
    status,
    'validated?':
      options.validated === undefined ? (status === 'finished' ? true : null) : options.validated,
    final_mark: status === 'finished' ? 100 : null,
    updated_at: options.updatedAt ?? '2026-10-01T10:00:00.000Z',
    created_at: options.createdAt ?? '2026-09-01T10:00:00.000Z',
    cursus_ids: options.cursusIds ?? [21],
    project: {
      id: options.projectId ?? 10,
      name: options.projectName ?? 'ft_printf',
      slug: options.slug ?? 'ft_printf',
    },
    user: apiUser(login, options.user),
  }
}

/** Un puesto ocupado ahora mismo. */
export function activeLocation(login: string, host: string, campusId = 22): ApiLocation {
  return {
    id: userId(login) * 10,
    host,
    begin_at: '2026-10-10T08:00:00.000Z',
    end_at: null,
    campus_id: campusId,
    user: apiUser(login, { location: host }),
  }
}
