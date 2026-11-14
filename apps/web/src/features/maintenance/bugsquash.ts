/**
 * «Aplasta bugs» (#104 del buzón): las cuentas del minijuego de la pantalla
 * de mantenimiento y de «no se puede conectar». Sin API ni red: todo pasa en
 * el navegador, porque sale justo cuando la API no está.
 */

/** Casillas del tablero (3 × 3): caben en el móvil y se aciertan con el dedo. */
export const CELLS = 9
/** Lo que dura una partida. */
export const ROUND_MS = 30_000
/** Lo que tarda un bug en irse a otra casilla si no se aplasta: menos cuantos más llevas. */
const SLOWEST_MS = 1100
const FASTEST_MS = 450

const BEST_KEY = 'peer4u_bugsquash_best'

/**
 * La casilla a la que salta el bug: cualquiera menos la que tiene ahora, para
 * que siempre se note que se ha movido.
 *
 * @param random Un número en [0, 1), como `Math.random` (inyectable en los tests).
 */
export function nextCell(random: () => number, current: number | null): number {
  const raw = Math.floor(random() * (CELLS - 1))
  // Lo que no sea un número del rango (un azar raro) cae en la primera.
  const pick = Number.isFinite(raw) ? Math.max(0, Math.min(CELLS - 2, raw)) : 0

  return current !== null && pick >= current ? pick + 1 : pick
}

/** Cuánto se queda el bug quieto: cada cinco aplastados va un poco más deprisa. */
export function stayMs(score: number): number {
  return Math.max(FASTEST_MS, SLOWEST_MS - Math.floor(Math.max(0, score) / 5) * 100)
}

/** El récord guardado en este navegador (0 si no hay o no se puede leer). */
export function loadBest(): number {
  try {
    const value = Number(localStorage.getItem(BEST_KEY))

    return Number.isSafeInteger(value) && value > 0 ? value : 0
  } catch {
    return 0
  }
}

/** Guarda el récord si lo es, y devuelve el que queda. */
export function saveBest(score: number): number {
  const best = Math.max(loadBest(), score)

  try {
    localStorage.setItem(BEST_KEY, String(best))
  } catch {
    // Sin almacenamiento, el récord dura lo que la pestaña.
  }

  return best
}
