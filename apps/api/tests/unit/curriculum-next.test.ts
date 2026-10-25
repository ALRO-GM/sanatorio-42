/**
 * El último círculo del plan nuevo (Python): el examen 6 y ft_transcendence.
 * Sin ella, quien aprobaba el examen 6 salía con el 100 % en Avance aunque no
 * hubiera hecho ft_transcendence (pasó con una persona en producción).
 */

import { describe, expect, it } from 'vitest'

import { migrate, openDatabase } from '../../src/core/db/database.js'
import { createCurriculum, LAST_CIRCLE } from '../../src/modules/replica/curriculum.js'
import type { FortyTwoClient } from '../../src/integrations/forty-two/client.js'
import { standingOf, unitsOf } from '../../src/modules/stats/progress.rules.js'

describe('plan nuevo: el último círculo', () => {
  it('lleva ft_transcendence además del examen 6', async () => {
    const db = await openDatabase({ url: 'file::memory:' })

    await migrate(db)
    await db.execute(
      `INSERT INTO projects (id, name, slug) VALUES
        (1, 'Libft', '42cursus-libft'),
        (2, 'Exam 06', '42next-exam-rank-06'),
        (3, 'ft_transcendence', 'ft_transcendence')`,
    )

    const curriculum = createCurriculum({
      db,
      client: {} as FortyTwoClient,
      hourlyReserve: 0,
    })
    const next = await curriculum.circles('next')

    expect(next.get(2)).toBe(LAST_CIRCLE)
    expect(next.get(3)).toBe(LAST_CIRCLE)

    // Con libft y el examen 6 aprobados, pero sin ft_transcendence, no se ha terminado.
    const units = unitsOf(
      [...next].map(([id, circle]) => ({ id, circle, slug: String(id), hours: 10 })),
    )
    const standing = standingOf(
      units,
      new Map([
        [1, 0],
        [2, 0],
      ]),
    )

    expect(standing.circles).toBeLessThan(100)
    expect(standing.circle).toBe(LAST_CIRCLE)
  })
})
