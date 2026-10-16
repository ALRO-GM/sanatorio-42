/**
 * Lo que permite al grafo de la Red no repintar miles de uniones en cada
 * fotograma. Sin lienzo: solo las cuentas, para poder probarlas.
 *
 * - Con el grafo quieto, las uniones se pintan una vez en una capa guardada y
 *   se reutiliza mientras no cambie nada de lo que se ve (vista, tamaño,
 *   posiciones, colores). Al pasar el ratón por encima de alguien solo se
 *   pintan sus uniones encima de la capa «apagada».
 * - Mientras las burbujas se recolocan, con muchas uniones solo se pintan las
 *   más fuertes: la forma se ve igual y cada fotograma cuesta mucho menos.
 */

/** Uniones que se pintan, como mucho, mientras el grafo se mueve. */
export const MOVING_LINKS = 2500

/** Las `max` uniones con más peso (las demás no se ven mientras todo se mueve). */
export function strongest<T extends { weight: number }>(links: readonly T[], max: number): T[] {
  if (links.length <= max) return [...links]

  return [...links].sort((a, b) => b.weight - a.weight).slice(0, Math.max(0, max))
}

/** Lo que tiene que coincidir para reutilizar una capa ya pintada. */
export type LayerState = {
  /** `rest`: nadie elegido; `dim`: alguien elegido, todo lo demás apagado. */
  kind: 'rest' | 'dim'
  view: { x: number; y: number; k: number }
  width: number
  height: number
  ratio: number
  /** Sube cada vez que algo se mueve, cambia el grafo o cambian los colores. */
  version: number
}

/** Una clave que cambia si cambia cualquier cosa que se vea en la capa. */
export function layerKey(state: LayerState): string {
  const { kind, view, width, height, ratio, version } = state

  return `${kind}|${view.x}|${view.y}|${view.k}|${width}|${height}|${ratio}|${version}`
}

/** El rectángulo del grafo que se ve, en sus coordenadas. */
export type Bounds = { left: number; top: number; right: number; bottom: number }

export function visibleBounds(
  view: { x: number; y: number; k: number },
  width: number,
  height: number,
): Bounds {
  return {
    left: -view.x / view.k,
    top: -view.y / view.k,
    right: (width - view.x) / view.k,
    bottom: (height - view.y) / view.k,
  }
}

/** `true` si el punto (con su margen) cae dentro de lo que se ve. */
export function inside(bounds: Bounds, x: number, y: number, margin = 0): boolean {
  return (
    x >= bounds.left - margin &&
    x <= bounds.right + margin &&
    y >= bounds.top - margin &&
    y <= bounds.bottom + margin
  )
}

/**
 * `true` si una unión puede cruzar lo que se ve. Se mira solo si las dos
 * puntas quedan del mismo lado de fuera: es barato y nunca deja fuera una que
 * se vea (alguna que no se ve se pinta igual, y no pasa nada).
 */
export function segmentMeets(
  bounds: Bounds,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): boolean {
  return !(
    (x1 < bounds.left && x2 < bounds.left) ||
    (x1 > bounds.right && x2 > bounds.right) ||
    (y1 < bounds.top && y2 < bounds.top) ||
    (y1 > bounds.bottom && y2 > bounds.bottom)
  )
}
