/**
 * De dónde sale la foto de alguien.
 *
 * Las fotos de 42 (`cdn.intra.42.fr`) ya no se ven sin sesión de la intra: la
 * CDN contesta 403. La API las pide con el token de la aplicación y las sirve en
 * `/avatars/:login`, así que la web las pide ahí. Lo que no sea de la CDN (la
 * demostración, datos de mentira) se usa tal cual.
 */

import { apiUrl } from './http'

const CDN = 'https://cdn.intra.42.fr/'

/** Solo logins con la forma de los de 42; con otra cosa no se monta ninguna dirección. */
const LOGIN = /^[a-z0-9-]{1,40}$/

/**
 * La dirección de la foto de alguien, o `null` si no tiene.
 *
 * @param proxy `false` para usar la de 42 tal cual (la API de mentira no sirve fotos).
 */
export function photoUrl(
  login: string,
  image: string | null,
  proxy = import.meta.env.VITE_USE_MOCK !== 'true',
): string | null {
  if (image === null || image === '') return null
  if (!proxy || !image.startsWith(CDN) || !LOGIN.test(login)) return image

  return apiUrl(`/avatars/${login}`)
}
