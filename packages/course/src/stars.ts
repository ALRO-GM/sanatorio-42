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
 * - **Por comprobaciones** (unidades que no se juegan en una terminal, como
 *   las del curso de RAG, que son un banco de pruebas): mirar y probar es
 *   gratis; lo que cuenta es cada vez que pides que se compruebe. Tres
 *   estrellas con las comprobaciones de la solución de referencia más una de
 *   margen (un tropiezo no quita la tercera); dos hasta el doble más dos; una
 *   con las que sean.
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
 * Las comprobaciones que caben en cada estrella de un banco de pruebas. `par`
 * son las de la solución de referencia (como poco, una).
 */
export function tryGoals(par: number): StarGoals {
  const base = Math.max(1, par)

  return { three: base + 1, two: base * 2 + 2 }
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
