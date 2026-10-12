/**
 * Red de correcciones de mentira: un campus pequeño con grupos que se corrigen
 * mucho entre sí y poco con el resto, para que el grafo tenga forma.
 *
 * Las cuentas de verdad (endogamia, comunidades) las hace la API; aquí hay una
 * versión mínima, lo justo para que la pantalla se pueda probar sin servidor.
 */

import type {
  NetworkGraph,
  NetworkLink,
  NetworkNode,
  NetworkPairDetail,
  NetworkPerson,
  NetworkStrictest,
} from '@sanatorio/contracts'

import type { NetworkParams } from '../types'
import { portrait } from './portrait'

const GROUPS = 6
const PEOPLE = 132
const SYLLABLES = [
  'al',
  'be',
  'ca',
  'di',
  'en',
  'fu',
  'ga',
  'lo',
  'ma',
  'ni',
  'or',
  'pe',
  'ro',
  'sa',
  'ti',
]

/** Azar con semilla: el mismo grafo en cada carga. */
function seeded(seed: number): () => number {
  let state = seed

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296

    return state / 4294967296
  }
}

type Person = { login: string; group: number; external: boolean; cohort: number }

function build(me: string): { people: Person[]; links: NetworkLink[] } {
  const random = seeded(42)
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T
  const people: Person[] = [{ login: me, group: 0, external: false, cohort: 2026 }]

  while (people.length < PEOPLE) {
    const login = `${pick(SYLLABLES)}${pick(SYLLABLES)}${pick(SYLLABLES)}-${people.length % 10}`

    if (people.some((person) => person.login === login)) continue

    const group = Math.floor(random() * GROUPS)

    people.push({ login, group, external: random() < 0.06, cohort: 2023 + (group % 4) })
  }

  const links: NetworkLink[] = []

  for (const [index, left] of people.entries()) {
    for (const right of people.slice(index + 1)) {
      if (left.external && right.external) continue

      const same = left.group === right.group
      // Dentro del grupo se cruzan a menudo; fuera, casi nunca.
      if (random() > (same ? 0.2 : 0.012)) continue

      const total = 1 + Math.floor(random() * random() * (same ? 9 : 3))
      const forth = Math.round(total * random())

      links.push({ source: left.login, target: right.login, forth, back: total - forth })
    }
  }

  return { people, links }
}

/** Las cuentas de cada persona sobre unas uniones. */
function statsOf(person: Person, links: readonly NetworkLink[]): NetworkNode {
  let given = 0
  let received = 0
  let partners = 0
  let mutual = 0

  for (const link of links) {
    const mine = link.source === person.login
    const theirs = link.target === person.login

    if (!mine && !theirs) continue

    given += mine ? link.forth : link.back
    received += mine ? link.back : link.forth
    partners += 1
    mutual += 2 * Math.min(link.forth, link.back)
  }

  const total = given + received
  const repetition = total === 0 ? 0 : (total - partners) / total
  const reciprocity = total === 0 ? 0 : mutual / total

  return {
    login: person.login,
    image: portrait(person.login),
    external: person.external,
    given,
    received,
    partners,
    repetition,
    reciprocity,
    endogamy: Math.round(50 * (repetition + reciprocity)),
    // Cada quien aprueba más o menos: sale de su login, siempre igual.
    givenPassRate: given < 3 ? null : 0.55 + ((person.login.charCodeAt(0) * 7) % 45) / 100,
    receivedPassRate: received < 3 ? null : 0.6 + ((person.login.charCodeAt(1) * 5) % 40) / 100,
    community: person.group,
    cohort: person.cohort,
    campusId: person.external ? null : MOCK_CAMPUSES[0].id,
  }
}

/** Los campus con correcciones en la web de mentira. */
const MOCK_CAMPUSES = [
  { id: 22, name: 'Madrid' },
  { id: 46, name: 'Barcelona' },
  { id: 37, name: 'Málaga' },
] as const

let cached: { me: string; people: Person[]; links: NetworkLink[] } | null = null

function world(me: string) {
  cached ??= { me, ...build(me) }

  return cached
}

export function mockNetwork(me: string, params: NetworkParams): NetworkGraph {
  const { people, links: every } = world(me)
  const min = params.min ?? 1
  const limit = params.limit ?? 300
  const focus = params.login ?? null
  // Un periodo o un proyecto dejan una parte de las correcciones, siempre la misma.
  const share =
    (params.from === undefined ? 1 : 0.45) *
    (params.projectId === undefined ? 1 : 0.35) *
    (params.verdict === undefined ? 1 : params.verdict === 'pass' ? 0.8 : 0.2)
  const random = seeded(7)
  const all = every.filter(() => random() < share)
  const strong = all.filter(
    (link) =>
      link.forth + link.back >= min &&
      (params.mutual !== true || (link.forth > 0 && link.back > 0)),
  )
  const around = new Set<string>(
    focus === null ? strong.flatMap((link) => [link.source, link.target]) : [focus],
  )

  if (focus !== null) {
    for (const link of strong) {
      if (link.source === focus) around.add(link.target)
      if (link.target === focus) around.add(link.source)
    }
  }

  const stats = people.map((person) => statsOf(person, all))
  const active = stats.filter((node) => node.given + node.received > 0)
  const candidates = active
    .filter((node) => around.has(node.login))
    .sort(
      (a, b) =>
        Number(b.login === focus) - Number(a.login === focus) ||
        b.given + b.received - (a.given + a.received),
    )
  const nodes = candidates.slice(0, limit)
  const shown = new Set(nodes.map((node) => node.login))
  const links = strong.filter((link) => shown.has(link.source) && shown.has(link.target))
  const insiders = active.filter((node) => !node.external)
  const weight = insiders.reduce((sum, node) => sum + node.given + node.received, 0) || 1
  const weighted = (value: (node: NetworkNode) => number): number =>
    insiders.reduce((sum, node) => sum + value(node) * (node.given + node.received), 0) / weight

  const wanted =
    params.campuses === undefined
      ? [MOCK_CAMPUSES[0].id]
      : params.campuses === 'all'
        ? MOCK_CAMPUSES.map((campus) => campus.id)
        : params.campuses.split(',').map(Number)
  const chosen: number[] = MOCK_CAMPUSES.map((campus) => campus.id).filter((id) =>
    wanted.includes(id),
  )

  return {
    query: {
      from: params.from ?? null,
      to: params.to ?? null,
      login: focus,
      projectId: params.projectId ?? null,
      verdict: params.verdict ?? null,
      mutual: params.mutual ?? false,
      min,
      limit,
    },
    campuses: chosen,
    available: [...MOCK_CAMPUSES],
    // Con varios campus, cada grupo es de uno: así se ve el color por campus.
    nodes: nodes.map((node, index) => ({
      ...node,
      campusId: node.external
        ? null
        : (chosen[
            (people.find((person) => person.login === node.login)?.group ?? index) % chosen.length
          ] ?? null),
    })),
    links,
    totals: {
      corrections: all.reduce((sum, link) => sum + link.forth + link.back, 0),
      people: active.length,
      pairs: all.length,
      mutualPairs: all.filter((link) => link.forth > 0 && link.back > 0).length,
      repetition: weighted((node) => node.repetition),
      reciprocity: weighted((node) => node.reciprocity),
      endogamy: Math.round(weighted((node) => node.endogamy)),
      communities: GROUPS,
    },
    hidden:
      candidates.length > nodes.length
        ? { nodes: candidates.length - nodes.length, links: 0 }
        : null,
    topPairs: [...all]
      .sort((a, b) => Math.min(b.forth, b.back) - Math.min(a.forth, a.back))
      .slice(0, 100),
    timeline: Array.from({ length: 30 }, (_, index) => {
      const date = new Date(Date.UTC(2024, 4 + index, 1))

      return {
        month: date.toISOString().slice(0, 7),
        corrections: Math.round(180 + 140 * Math.sin(index / 2.2) + (index % 5) * 30),
      }
    }),
    projects: [
      { id: 10, name: 'ft_printf', corrections: 420, passRate: 0.81 },
      { id: 11, name: 'get_next_line', corrections: 380, passRate: 0.74 },
      { id: 12, name: 'push_swap', corrections: 260, passRate: 0.62 },
      { id: 13, name: 'minishell', corrections: 190, passRate: 0.48 },
      { id: 14, name: 'Libft', corrections: 150, passRate: 0.86 },
    ],
    sync: {
      phase: 'copying',
      rows: 51_300,
      total: 81_723,
      first: '2019-11-05T11:00:00.000Z',
      last: new Date().toISOString(),
    },
  }
}

export function mockPeople(me: string, q: string): NetworkPerson[] {
  const { people, links } = world(me)
  const prefix = q.trim().toLowerCase()

  if (prefix === '') return []

  return people
    .filter((person) => person.login.startsWith(prefix))
    .slice(0, 8)
    .map((person) => {
      const stats = statsOf(person, links)

      return { login: person.login, image: stats.image, corrections: stats.given + stats.received }
    })
}

const PROJECTS = ['Libft', 'ft_printf', 'get_next_line', 'push_swap', 'minishell']

export function mockPair(me: string, a: string, b: string): NetworkPairDetail {
  const link = world(me).links.find(
    (candidate) =>
      (candidate.source === a && candidate.target === b) ||
      (candidate.source === b && candidate.target === a),
  )
  const forth = link === undefined ? 0 : link.source === a ? link.forth : link.back
  const back = link === undefined ? 0 : link.source === a ? link.back : link.forth
  const day = 24 * 60 * 60_000

  return {
    a,
    b,
    forth,
    back,
    corrections: Array.from({ length: forth + back }, (_, index) => {
      const mark = index % 4 === 3 ? 0 : 100 + (index % 3 === 0 ? 25 : 0)

      return {
        id: index + 1,
        corrector: index < forth ? a : b,
        corrected: index < forth ? b : a,
        project: PROJECTS[index % PROJECTS.length] ?? null,
        at: new Date(Date.now() - (index * 17 + 3) * day).toISOString(),
        mark,
        positive: mark > 0,
      }
    }).sort((x, y) => (x.at < y.at ? 1 : -1)),
  }
}

export function mockStrictest(me: string, min: number, order: 'asc' | 'desc'): NetworkStrictest {
  const { people, links } = world(me)
  // En el campus de mentira se evalúa poco: se multiplica para que el mínimo tenga juego.
  const everyone = people
    .filter((person) => !person.external)
    .map((person) => {
      const stats = statsOf(person, links)
      const judged = stats.given * 6
      const failed = Math.round(judged * (1 - (stats.givenPassRate ?? 0.9)))

      return { login: person.login, image: stats.image, judged, failed }
    })
  const eligible = everyone.filter((person) => person.judged >= min)

  return {
    min,
    order,
    eligible: eligible.length,
    campusFailRate: 0.11,
    people: eligible
      .map((person) => ({ ...person, failRate: person.failed / person.judged }))
      .sort(
        (a, b) =>
          (order === 'desc' ? b.failRate - a.failRate : a.failRate - b.failRate) ||
          b.judged - a.judged,
      )
      .slice(0, 100),
  }
}
