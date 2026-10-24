/**
 * Quién entra en Sanatorio, según su `cursus_users` de 42 (ver
 * `docs/piscineros.md`). Sin base de datos: se prueba sola.
 */

import type { ApiUser } from '../../integrations/forty-two/types.js'

/** El 42cursus: quien lo tiene es estudiante. */
const CORE_CURSUS_ID = 21
/** La C Piscine. */
const PISCINE_CURSUS_ID = 9
const DAY_MS = 86_400_000
/** Una piscina sigue «en curso» hasta 60 días después de empezar… */
const PISCINE_AFTER_MS = 60 * DAY_MS
/** …y ya cuenta 30 días antes, por si alguien entra antes de que empiece. */
const PISCINE_BEFORE_MS = 30 * DAY_MS

/**
 * El grupo de alguien: `student` con el 42cursus; `pool` sin él y con la C
 * Piscine en curso; `other`, lo demás (Discovery, piscinas antiguas, nada).
 *
 * Si 42 no manda `cursus_users` (no debería: `/v2/me` lo trae siempre) no se
 * puede saber y se deja pasar como estudiante, como antes de esta regla.
 */
export function audienceOf(profile: ApiUser, now: number): 'student' | 'pool' | 'other' {
  const cursus = profile.cursus_users

  if (cursus === undefined || cursus === null) return 'student'
  if (cursus.some((entry) => entry.cursus_id === CORE_CURSUS_ID)) return 'student'

  const piscine = cursus.some((entry) => {
    if (entry.cursus_id !== PISCINE_CURSUS_ID) return false

    const begin = Date.parse(entry.begin_at ?? '')

    return (
      !Number.isNaN(begin) && begin >= now - PISCINE_AFTER_MS && begin <= now + PISCINE_BEFORE_MS
    )
  })

  return piscine ? 'pool' : 'other'
}
