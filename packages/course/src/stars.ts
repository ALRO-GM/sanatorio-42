/**
 * Las estrellas de un punto del curso. Dos maneras de medir, según el punto:
 *
 * - **Por comandos** (unidades): tres estrellas con tantos comandos como la
 *   solución de referencia, contados igual; dos hasta la mitad más uno; una
 *   con los que sean, al conseguirlo. Lo que no cuenta (mirar, lo que falla)
 *   lo decide cada motor.
 * - **Por tiempo** (jefes contrarreloj): tres estrellas en la mitad del tiempo
 *   o menos, dos hasta tres cuartos y una dentro del límite. Fuera del límite
 *   no hay punto: es un contrarreloj.
 *
 * Los umbrales se enseñan antes de empezar y la API puntúa con la misma
 * función, así que no hay sorpresas.
 */

export type Stars = 1 | 2 | 3

/** Comandos que caben en cada estrella (`three` o menos: ★★★; `two` o menos: ★★☆). */
export type StarGoals = { three: number; two: number }

/** Segundos que caben en cada estrella y el límite (pasado el límite no cuenta). */
export type TimeGoals = { three: number; two: number; limit: number }

export function commandGoals(par: number): StarGoals {
  return { three: par, two: Math.ceil(par * 1.5) + 1 }
}

export function starsFor(used: number, goals: StarGoals): Stars {
  if (used <= goals.three) return 3
  if (used <= goals.two) return 2

  return 1
}

export function timeGoals(limit: number): TimeGoals {
  return { three: Math.round(limit * 0.5), two: Math.round(limit * 0.75), limit }
}

/** Las estrellas de un contrarreloj; `0` si se pasó del límite. */
export function starsForTime(seconds: number, goals: TimeGoals): Stars | 0 {
  if (seconds > goals.limit) return 0
  if (seconds <= goals.three) return 3
  if (seconds <= goals.two) return 2

  return 1
}
