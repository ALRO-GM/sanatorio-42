/**
 * Estadísticas de Ayuda de mentira: cifras y clasificaciones con logins
 * inventados (también salen en la demostración pública). «Siempre» es «este
 * mes» multiplicado, para que se note el cambio.
 */

import type { HelpStats, StatsEntry, StatsSection, StatsSectionId } from '@sanatorio/contracts'

import { ME } from './data'
import { portrait } from './portrait'
import { delay } from './state'
import type { Api } from '../types'

type Row = [login: string, value: number, extra: number]

const MONTH: Record<StatsSectionId, { totals: Record<string, number>; rows: Row[] }> = {
  consulta: {
    totals: { sessions: 48, verified: 31, minutes: 1290, helped: 26 },
    rows: [
      ['jdoe', 9, 360],
      ['cfernandez', 7, 240],
      [ME.login, 5, 180],
      ['mgarcia', 5, 150],
      ['anavarro', 3, 90],
      ['lruiz', 2, 60],
    ],
  },
  tablon: {
    totals: { doubts: 64, answers: 141, solved: 39 },
    rows: [
      ['mgarcia', 11, 25],
      ['jdoe', 8, 19],
      ['lsoto', 6, 9],
      ['anavarro', 4, 12],
      [ME.login, 2, 7],
    ],
  },
  terapia: {
    totals: { groups: 14, seats: 52, people: 37 },
    rows: [
      ['lsoto', 6, 2],
      [ME.login, 4, 1],
      ['cfernandez', 4, 0],
      ['rsoto', 3, 1],
    ],
  },
  pizarras: {
    totals: { boards: 6, seats: 71, people: 49 },
    rows: [
      ['cfernandez', 34, 3],
      ['jdoe', 22, 2],
      ['anavarro', 15, 1],
    ],
  },
  notgames: {
    totals: { games: 23, people: 18, correct: 412, wrong: 167 },
    rows: [
      ['lruiz', 7, 96],
      [ME.login, 5, 81],
      ['mgarcia', 5, 74],
      ['jdoe', 3, 58],
      ['lsoto', 1, 40],
    ],
  },
}

function sectionOf(id: StatsSectionId, times: number): StatsSection {
  const { totals, rows } = MONTH[id]
  const entries: StatsEntry[] = []

  for (const [index, [login, value, extra]] of rows.entries()) {
    const previous = entries[index - 1]
    const tie = previous?.value === value * times && previous.extra === extra * times

    entries.push({
      rank: tie ? previous.rank : index + 1,
      login,
      image: portrait(login),
      value: value * times,
      extra: extra * times,
    })
  }

  return {
    id,
    totals: Object.entries(totals).map(([key, value]) => ({ key, value: value * times })),
    ranking: entries,
    me: entries.find((entry) => entry.login === ME.login) ?? null,
  }
}

export const statsMock: Pick<Api, 'getHelpStats'> = {
  async getHelpStats(period): Promise<HelpStats> {
    await delay(200)

    const times = period === 'all' ? 4 : 1

    return {
      period,
      sections: (Object.keys(MONTH) as StatsSectionId[]).map((id) => sectionOf(id, times)),
    }
  },
}
