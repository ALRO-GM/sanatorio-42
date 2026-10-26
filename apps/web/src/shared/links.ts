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

import type { CoreTrack, ProgressPopulation, ProgressScope } from '@sanatorio/contracts'

/** El expediente público de alguien. */
export function recordHref(login: string): string {
  return `#/expediente/${encodeURIComponent(login)}`
}

/** La red de correcciones, centrada en alguien si se dice quién. */
export function networkHref(login: string | null = null): string {
  return login === null ? '#/red' : `#/red/${encodeURIComponent(login)}`
}

/**
 * Lo que se enciende al abrir el Avance desde un enlace (el health check, por
 * ejemplo). Lo que no se dice queda como lo tenga cada cual.
 */
type ProgressPreset = {
  plan?: CoreTrack[] | undefined
  pop?: ProgressPopulation[] | undefined
  scope?: ProgressScope[] | undefined
  paces?: boolean | undefined
  /** Si se ve tu línea. */
  me?: boolean | undefined
  /**
   * El periodo (los primeros `1`…`24` meses o `all`), solo para esa visita. Los
   * de antes (`8`, `15`…) caen en el siguiente que hay (`rangeOf`).
   */
  range?: string | undefined
}

const PLAN_PARAM: Record<CoreTrack, string> = { classic: 'c', next: 'python' }
const PLAN_OF: Record<string, CoreTrack> = {
  c: 'classic',
  classic: 'classic',
  python: 'next',
  next: 'next',
}
const POP_OF: Record<string, ProgressPopulation> = {
  active: 'current',
  current: 'current',
  finished: 'finished',
  blackholed: 'blackholed',
}
const SCOPE_OF: Record<string, ProgressScope> = { campus: 'campus', all: 'all' }

/**
 * El Avance, con opciones encendidas: `#/avance?plan=python&pop=current,blackholed&scope=campus&paces=1&me=1`.
 * Se leen una vez al abrirlo (`readProgressPreset`) y la dirección vuelve a `#/avance`.
 */
export function progressHref(preset: ProgressPreset = {}): string {
  const query = new URLSearchParams()

  if (preset.plan !== undefined)
    query.set('plan', preset.plan.map((each) => PLAN_PARAM[each]).join(','))
  if (preset.pop !== undefined) query.set('pop', preset.pop.join(','))
  if (preset.scope !== undefined) query.set('scope', preset.scope.join(','))
  if (preset.paces !== undefined) query.set('paces', preset.paces ? '1' : '0')
  if (preset.me !== undefined) query.set('me', preset.me ? '1' : '0')
  if (preset.range !== undefined) query.set('range', preset.range)

  const text = query.toString().replace(/%2C/g, ',')

  return text === '' ? '#/avance' : `#/avance?${text}`
}

/**
 * Lo que pide una dirección del Avance (`progressHref`), o `null` si no pide
 * nada. Lo que no se entiende se ignora: la dirección la escribe cualquiera.
 */
export function readProgressPreset(hash: string): ProgressPreset | null {
  const at = hash.indexOf('?')

  if (!/^#\/?avance(\?|$)/.test(hash) || at === -1) return null
  const query = new URLSearchParams(hash.slice(at + 1))
  const list = <T>(key: string, known: Record<string, T>): T[] | undefined => {
    const raw = query.get(key)

    if (raw === null) return undefined
    const found = [
      ...new Set(raw.split(',').flatMap((each) => (each in known ? [known[each] as T] : []))),
    ]

    // Sin nada que se entienda, como si no lo dijera: mejor lo de siempre que nada encendido.
    return found.length === 0 ? undefined : found
  }
  const flag = (key: string): boolean | undefined => {
    const raw = query.get(key)

    return raw === null ? undefined : raw === '1' || raw === 'true'
  }
  const preset: ProgressPreset = {
    plan: list('plan', PLAN_OF),
    pop: list('pop', POP_OF),
    scope: list('scope', SCOPE_OF),
    paces: flag('paces'),
    me: flag('me'),
    range: query.get('range') ?? undefined,
  }

  return Object.values(preset).some((value) => value !== undefined) ? preset : null
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

/**
 * Dónde se soltó una sugerencia (`docs/sugerencias.md`): la dirección que
 * había entonces si es de la web (`#/…`, sin espacios) y, si no, la sección.
 */
export function placeHref(hash: string, section: string): string {
  return /^#\/\S*$/.test(hash) ? hash : `#/${encodeURIComponent(section)}`
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

/**
 * Una dirección de fuera que llega de la API (un evento de 42), solo si es
 * `https://`. Hoy la API siempre las hace así; esto es por si un día no, para
 * que un `javascript:` nunca acabe en un enlace.
 */
export function externalHref(url: string | null): string | null {
  return url !== null && /^https:\/\//i.test(url) ? url : null
}
