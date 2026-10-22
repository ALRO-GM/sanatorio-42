/**
 * El avance en el common core (#87): por círculos (cada círculo pesa lo mismo)
 * y por horas estimadas, con los proyectos entre los que se elige como una
 * sola casilla, y las líneas de cada pace.
 */
import { describe, expect, it } from 'vitest'

import { curveOf, paceLines, unitsOf } from '../../src/modules/stats/progress.rules.js'
import type { PlanProject } from '../../src/modules/stats/progress.rules.js'

const DAY = 86_400_000
const START = Date.UTC(2026, 0, 1)

// Un plan de juguete: círculo 0 con un proyecto; círculo 1 con dos, uno de
// ellos a elegir entre dos.
const PLAN: PlanProject[] = [
  { id: 1, slug: 'libft', circle: 0, hours: 70 },
  { id: 2, slug: 'printf', circle: 1, hours: 70 },
  { id: 3, slug: 'so_long', circle: 1, hours: 60 },
  { id: 4, slug: 'fdf', circle: 1, hours: 100 },
]
const CHOICES = { graphics: ['so_long', 'fdf'] }

describe('avance en el common core', () => {
  it('un grupo a elegir es una sola casilla, con su círculo más bajo y las horas del más corto', () => {
    expect(unitsOf(PLAN, CHOICES)).toEqual([
      { circle: 0, hours: 70, ids: [1] },
      { circle: 1, hours: 70, ids: [2] },
      { circle: 1, hours: 60, ids: [3, 4] },
    ])
  })

  it('por círculos pesan lo mismo; por horas, lo que estima 42', () => {
    const units = unitsOf(PLAN, CHOICES)
    // libft el día 10 y fdf (del grupo) el día 40; printf, sin hacer.
    const done = new Map([
      [1, START + 10 * DAY],
      [4, START + 40 * DAY],
    ])
    const curve = curveOf(units, done, START, [0, 10, 30, 40, 60], START + 50 * DAY)

    // Círculo 0 entero (1/2) y medio círculo 1 (1/4): 75 %.
    expect(curve.circles).toEqual([0, 50, 50, 75, null])
    // 70 + 60 de 200 horas (el grupo cuenta las del más corto).
    expect(curve.hours).toEqual([0, 35, 35, 65, null])
  })

  it('cada pace pide tener cada círculo completo a sus días', () => {
    const lines = paceLines(unitsOf(PLAN, CHOICES))
    const fastest = lines.circles[0]

    expect(fastest?.pace).toBe(8)
    // Empieza en 0; el círculo 0 a los 8 días (50 %) y el 1 a los 32 (100 %).
    expect(fastest?.points.slice(0, 3)).toEqual([
      [0, 0],
      [8, 50],
      [32, 100],
    ])
    expect(lines.hours[0]?.points[1]).toEqual([8, 35])
    expect(lines.circles.map((line) => line.pace)).toEqual([8, 12, 15, 18, 22, 24])
  })
})
