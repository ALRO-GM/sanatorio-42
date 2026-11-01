/**
 * Las kickoffs reales de un campus (`core/kickoffs.ts`): los días en que entra
 * mucha gente, y quien entra a destiempo, con la anterior más cercana a su
 * entrada en 42.
 */
import { describe, expect, it } from 'vitest'

import { kickoffFor, kickoffMonths, realKickoffs } from '../../src/core/kickoffs.js'

const at = (day: string): number => Date.parse(`${day}T09:00:00.000Z`)
const midnight = (day: string): number => Date.parse(`${day}T00:00:00.000Z`)
const many = (day: string, n: number): number[] => Array.from({ length: n }, () => at(day))

describe('kickoffs reales', () => {
  it('son los días con mucha gente; quien entra solo o en grupos pequeños no hace kickoff', () => {
    const starts = [
      ...many('2024-10-07', 60),
      ...many('2024-10-08', 5),
      ...many('2025-03-03', 40),
      ...many('2025-06-16', 2),
      ...many('2025-01-20', 3),
    ]

    expect(realKickoffs(starts)).toEqual([midnight('2024-10-07'), midnight('2025-03-03')])
  })

  it('un grupo pequeño frente a uno muy grande no cuenta, aunque pase del mínimo', () => {
    // 9 personas pasan del mínimo (8) pero no del 10 % de 200.
    expect(realKickoffs([...many('2024-10-07', 200), ...many('2025-02-10', 9)])).toEqual([
      midnight('2024-10-07'),
    ])
  })

  it('sin grupos grandes, no hay kickoffs', () => {
    expect(realKickoffs([at('2024-01-01'), at('2024-05-01'), Number.NaN])).toEqual([])
  })

  it('quien entró con un grupo va con él; a destiempo, con la anterior a su entrada en 42', () => {
    const kickoffs = [midnight('2024-10-07'), midnight('2025-03-03')]

    // Con el grupo (con holgura de unos días).
    expect(kickoffFor(kickoffs, at('2024-10-09'), at('2024-10-09'))).toBe(kickoffs[0])
    // Llega de otro campus en junio, pero entró en 42 en noviembre: la de octubre.
    expect(kickoffFor(kickoffs, at('2025-06-16'), at('2024-11-04'))).toBe(kickoffs[0])
    // Entró en 42 en abril: la de marzo, la anterior más cercana.
    expect(kickoffFor(kickoffs, at('2025-06-16'), at('2025-04-01'))).toBe(kickoffs[1])
    // Antes de la primera del campus: la más cercana.
    expect(kickoffFor(kickoffs, at('2025-06-16'), at('2023-02-01'))).toBe(kickoffs[0])
    // Sin kickoffs reales, nada.
    expect(kickoffFor([], at('2025-06-16'), at('2025-06-16'))).toBeNull()
  })

  it('cada campus con las suyas; sin kickoffs reales, el mes en que empezó', () => {
    const people = [
      ...many('2024-10-07', 30).map((start, index) => ({
        key: `m${String(index)}`,
        campus: 22,
        start,
        general: start,
      })),
      { key: 'traslado', campus: 22, start: at('2025-06-16'), general: at('2024-11-04') },
      // En París no hay grupos grandes: su mes.
      { key: 'paris', campus: 1, start: at('2025-06-16'), general: at('2024-11-04') },
      { key: 'suelto', campus: null, start: at('2025-02-01'), general: at('2025-02-01') },
    ]
    const months = kickoffMonths(people)

    expect(months.get('m0')).toBe('2024-10')
    expect(months.get('traslado')).toBe('2024-10')
    expect(months.get('paris')).toBe('2025-06')
    expect(months.get('suelto')).toBe('2025-02')
  })
})
