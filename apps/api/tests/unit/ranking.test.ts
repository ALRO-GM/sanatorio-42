/**
 * Quién va más rápido: orden por círculo, por % de círculos o por % de horas,
 * con empates, rangos, plan y kickoff.
 */
import { describe, expect, it } from 'vitest'

import { kickoffsOf, rankRunners } from '../../src/modules/stats/ranking.rules.js'
import type { RankingFilters, Runner } from '../../src/modules/stats/ranking.rules.js'

const runner = (
  login: string,
  circle: number,
  circles: number,
  hours: number,
  extra: Partial<Runner> = {},
): Runner => ({
  login,
  image: null,
  track: 'classic',
  circle,
  circles,
  hours,
  kickoff: '2025-09',
  ...extra,
})

const ALL: RankingFilters = {
  by: 'circle',
  plan: 'all',
  kickoff: null,
  cohort: 'only',
  circleMin: 0,
  circleMax: 7,
  pctMin: 0,
  pctMax: 100,
}

const RUNNERS = [
  runner('ana', 3, 50, 30),
  runner('leo', 3, 50, 30),
  runner('eva', 2, 60, 45, { track: 'next', kickoff: '2026-02' }),
  runner('sol', 4, 58, 70, { kickoff: '2024-03' }),
]

const logins = (filters: Partial<RankingFilters>) =>
  rankRunners(RUNNERS, { ...ALL, ...filters }).map(
    (entry) => `${String(entry.rank)}:${entry.login}`,
  )

describe('clasificación de quién va más rápido', () => {
  it('normal: cada orden con su desempate; mismas cifras, mismo puesto', () => {
    expect(logins({ by: 'circle' })).toEqual(['1:sol', '2:ana', '2:leo', '4:eva'])
    expect(logins({ by: 'circles' })).toEqual(['1:eva', '2:sol', '3:ana', '3:leo'])
    expect(logins({ by: 'hours' })).toEqual(['1:sol', '2:eva', '3:ana', '3:leo'])
  })

  it('límite: los rangos incluyen sus extremos; el % es el de lo que ordena', () => {
    expect(logins({ circleMin: 3, circleMax: 3 })).toEqual(['1:ana', '1:leo'])
    expect(logins({ by: 'hours', pctMin: 45, pctMax: 45 })).toEqual(['1:eva'])
    expect(logins({ by: 'circle', pctMin: 58 })).toEqual(['1:sol', '2:eva'])
  })

  it('plan y kickoff: solo ese, o ese y los siguientes', () => {
    expect(logins({ plan: 'next' })).toEqual(['1:eva'])
    expect(logins({ kickoff: '2025-09' })).toEqual(['1:ana', '1:leo'])
    expect(logins({ kickoff: '2025-09', cohort: 'since' })).toEqual(['1:ana', '1:leo', '3:eva'])
    expect(kickoffsOf(RUNNERS)).toEqual([
      { month: '2026-02', people: 1 },
      { month: '2025-09', people: 2 },
      { month: '2024-03', people: 1 },
    ])
  })

  it('vacío: sin gente, sin puestos ni kickoffs', () => {
    expect(rankRunners([], ALL)).toEqual([])
    expect(kickoffsOf([])).toEqual([])
    expect(logins({ circleMin: 7 })).toEqual([])
  })

  it('el kickoff no sale en la respuesta: solo lo que ya enseñaba la clasificación', () => {
    expect(Object.keys(rankRunners(RUNNERS, ALL)[0] ?? {}).sort()).toEqual([
      'circle',
      'circles',
      'hours',
      'image',
      'login',
      'rank',
      'track',
    ])
  })
})
