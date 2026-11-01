/**
 * API de mentira: el álbum de correcciones (`docs/correcciones-coleccion.md`).
 * La rareza sale inventada de cada proyecto del grafo de mentira y los puestos,
 * de gente inventada; tu fila, de tu grafo de mentira, como haría la API.
 */

import type {
  CollectionEntry,
  CollectionGroup,
  CollectionStanding,
  CorrectionCollection,
} from '@sanatorio/contracts'

import type { Api } from '../types'
import { ME } from './data'
import { doubtsMock } from './doubts'
import { poolMocking } from './pool'
import { delay } from './state'

/** Gente inventada con su álbum: cromos conseguidos y posibles. */
const PEOPLE: [string, number, number][] = [
  ['lmarin-g', 9, 9],
  ['pvidal-r', 8, 9],
  ['jdoe', 6, 7],
  ['rsoto', 4, 5],
  ['mlopez', 5, 7],
  ['mgarcia', 3, 5],
  ['lsoto', 2, 4],
  ['aperez-m', 3, 6],
  ['cruiz-t', 1, 3],
  ['nfuentes', 1, 4],
  ['ograu', 0, 2],
]

/** A qué grupo va cada cual (las amistades son todas; el mundo, todas y más). */
const IN: Record<CollectionGroup, (index: number) => boolean> = {
  friends: () => true,
  kickoff: (index) => index % 2 === 0,
  circle: (index) => index % 3 !== 1,
  world: () => true,
}

/** Lo que el mundo entero tiene además de la gente de arriba. */
const WORLD_EXTRA = 1198

const round3 = (value: number): number => Math.round(value * 1000) / 1000

/** Puestos como en la API: mismo % y mismos cromos, mismo puesto. */
function ranked(rows: Omit<CollectionEntry, 'rank'>[]): CollectionEntry[] {
  const sorted = [...rows].sort(
    (a, b) => b.share - a.share || b.collected - a.collected || a.login.localeCompare(b.login),
  )

  return sorted.map((row) => ({
    ...row,
    rank:
      sorted.findIndex((other) => other.share === row.share && other.collected === row.collected) +
      1,
  }))
}

export const collectionMock: Pick<Api, 'getCorrectionCollection'> = {
  async getCorrectionCollection(group) {
    const graph = await doubtsMock.getDoubtGraph()

    await delay(120)

    const projects = graph.circles.flatMap((ring) => ring.projects)
    const mine = projects.filter((project) => project.status === 'finished' && !project.retired)
    const collected = mine.filter((project) => project.corrected > 0).length
    const me =
      mine.length === 0
        ? null
        : {
            login: ME.login,
            image: ME.image,
            collected,
            eligible: mine.length,
            share: round3(collected / mine.length),
          }
    const groups: CollectionGroup[] = poolMocking()
      ? ['friends', 'kickoff', 'world']
      : ['friends', 'kickoff', 'circle', 'world']
    const boardOf = (each: CollectionGroup): CollectionEntry[] =>
      ranked([
        ...PEOPLE.filter((_, index) => IN[each](index)).map(([login, owned, total]) => ({
          login,
          image: null,
          collected: owned,
          eligible: total,
          share: round3(owned / total),
        })),
        ...(me === null ? [] : [me]),
      ])
    const standings: CollectionStanding[] = groups.map((each) => {
      const board = boardOf(each)
      const rank = board.find((row) => row.login === ME.login)?.rank ?? null
      const size = board.length + (each === 'world' ? WORLD_EXTRA : 0)

      return {
        group: each,
        label:
          each === 'kickoff' ? '2026-09' : each === 'circle' ? String(graph.currentCircle) : null,
        size,
        // En el mundo, la gente de más va repartida: tu puesto baja en proporción.
        rank: rank === null || each !== 'world' ? rank : Math.round((rank * size) / board.length),
      }
    })
    const board = groups.includes(group) ? boardOf(group) : []

    return {
      // Lo antiguo lo tiene casi todo el mundo; lo nuevo, poca gente.
      rarity: projects.map((project, index) => {
        const eligible = Math.max(0, 400 - index * 23)
        // Born2beroot, legendario: casi nadie lo corrige (el objetivo «más raro»).
        const share =
          project.projectId === 3102
            ? 0.08
            : Math.max(0.03, 0.92 - index * 0.11 - (project.projectId % 5) * 0.03)

        return {
          projectId: project.projectId,
          eligible,
          holders: Math.round(eligible * share),
          share: round3(share),
        }
      }),
      standings,
      group,
      rows: board.slice(0, 50),
      me: board.find((row) => row.login === ME.login) ?? null,
    } satisfies CorrectionCollection
  },
}
