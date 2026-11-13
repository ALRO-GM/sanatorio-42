/**
 * Las estrellas de un punto del curso. Tres maneras de medir, según el punto:
 *
 * - **Por comandos** (unidades): tres estrellas con tantos comandos como la
 *   solución de referencia, contados igual; dos hasta la mitad más uno; una
 *   con los que sean, al conseguirlo. Lo que no cuenta (mirar, lo que falla)
 *   lo decide cada motor.
 * - **Por comprobaciones** (pruebas que se configuran): tres estrellas a la
 *   primera, dos con hasta tres comprobaciones y una con más (`checkGoals`).
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

/**
 * Por **comprobaciones**, la regla hermana de `commandGoals` para las pruebas
 * que no se teclean en una terminal sino que se configuran y se comprueban
 * (el esquema de red del curso de NetPractice): lo que cuenta es cuántas
 * veces hubo que pulsar «Comprobar» hasta acertar. ★★★ a la primera, ★★☆ con
 * hasta dos fallos (tres comprobaciones) y ★☆☆ con más. Se puntúa con
 * `starsFor`, como los comandos.
 */
export function checkGoals(): StarGoals {
  return { three: 1, two: 3 }
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
