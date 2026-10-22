/**
 * Las direcciones que la web escribe, en un solo sitio.
 *
 * Un login va en la dirección tal cual se ve: en 42 es un identificador público
 * (sale en la intra y en cada puesto), no un secreto, y cifrarlo solo rompería
 * los enlaces que la gente se pasa. Lo que sí hace falta es **codificarlo**
 * siempre, para que un valor raro no pueda cambiar la ruta ni colar otra cosa.
 *
 * Todo va en el hash (`#/…`): el navegador no manda esa parte al servidor, así
 * que ni la sección que miras ni a quién miras quedan en ningún registro, ni
 * salen en la cabecera `Referer` al seguir un enlace a otra web.
 */

/** El expediente público de alguien. */
export function recordHref(login: string): string {
  return `#/expediente/${encodeURIComponent(login)}`
}

/** La red de correcciones, centrada en alguien si se dice quién. */
export function networkHref(login: string | null = null): string {
  return login === null ? '#/red' : `#/red/${encodeURIComponent(login)}`
}

/** Not-games: la lista de salas, o una sala si se dice cuál. */
export function notGamesHref(room: number | null = null): string {
  return room === null ? '#/notgames' : `#/notgames/${room}`
}

/** Not-games: una partida por turnos (ajedrez). Va con una `t` delante: `#/notgames/t12`. */
export function turnGameHref(room: number): string {
  return `#/notgames/t${room}`
}

/** El calendario, o el calendario con un evento abierto (`board:12`, `therapy:5`). */
export function calendarHref(event: string | null = null): string {
  return event === null ? '#/calendario' : `#/calendario/${encodeURIComponent(event)}`
}

/** El perfil de alguien en la intra de 42. */
/** Tu propio perfil de la intra (la intra lo abre con tu sesión). */
export const INTRA_HOME = 'https://profile.intra.42.fr/'

export function intraHref(login: string): string {
  return `https://profile.intra.42.fr/users/${encodeURIComponent(login)}`
}

/**
 * Un trozo de dirección, descodificado. `null` si está mal escrito.
 *
 * `decodeURIComponent` lanza un error con un `%` suelto (`#/expediente/%`), y
 * una dirección la puede escribir cualquiera: sin esto, un enlace mal pegado
 * dejaba la web en blanco.
 */
export function decodePart(part: string): string | null {
  try {
    return decodeURIComponent(part)
  } catch {
    return null
  }
}
