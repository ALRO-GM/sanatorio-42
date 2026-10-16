/**
 * Reglas para deducir el círculo de un proyecto a partir de lo que se ve en
 * cada persona. Sin base ni red.
 *
 * Cada persona «vota» un círculo para cada proyecto suyo: cuántos rangos tenía
 * validados cuando se apuntó. Casi todo el mundo vota el de verdad; quien repite
 * o hace uno de más se apunta tarde y vota uno mayor, y algún caso raro (un
 * proyecto recreado, un rango validado tarde) vota uno menor.
 */

/**
 * Cuántas personas tienen que coincidir en un círculo para fiarse de él: dos, o
 * el 5 % de quienes han votado si son muchas. Un caso raro suelto no basta.
 */
export function agreement(voters: number): number {
  return Math.max(2, Math.ceil(voters * 0.05))
}

/**
 * El círculo de un proyecto según los votos: el más bajo en el que coincide
 * bastante gente (se queda con el bajo porque los retrasos solo suben). Si no
 * hay acuerdo en ninguno, la mediana. `null` si nadie ha votado.
 *
 * @param votes Cuántas personas votan cada círculo.
 */
export function learnedCircle(votes: ReadonlyMap<number, number>): number | null {
  const circles = [...votes.entries()]
    .filter(([circle, count]) => Number.isInteger(circle) && circle >= 0 && count > 0)
    .sort((a, b) => a[0] - b[0])
  const voters = circles.reduce((sum, [, count]) => sum + count, 0)

  if (voters === 0) return null

  const needed = agreement(voters)
  const agreed = circles.find(([, count]) => count >= needed)

  if (agreed !== undefined) return agreed[0]

  // Sin acuerdo: el voto del medio (el de abajo si son pares).
  let seen = 0

  for (const [circle, count] of circles) {
    seen += count

    if (seen * 2 >= voters) return circle
  }

  return circles.at(-1)?.[0] ?? null
}
