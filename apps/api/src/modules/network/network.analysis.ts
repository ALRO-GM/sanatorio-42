/**
 * Las cuentas de la red de correcciones. Funciones puras: reciben parejas ya
 * contadas y devuelven el grafo, sin tocar la base ni el reloj.
 *
 * ## Endogamia
 *
 * Para cada persona, con `W` correcciones (hechas más recibidas) repartidas
 * entre `P` personas distintas:
 *
 *  - **repetición** = `(W − P) / W`: qué parte de sus correcciones son con
 *    alguien con quien ya se había cruzado. Quien nunca repite tiene 0.
 *  - **reciprocidad** = `Σ 2·min(a→b, b→a) / W`: qué parte son "devueltas". Si
 *    corrijo a alguien tres veces y esa persona me corrige dos, cuatro de las
 *    cinco van emparejadas.
 *  - **endogamia** = la media de las dos, de 0 a 100.
 *
 * La del campus es la media ponderada por actividad, para que alguien con dos
 * correcciones no pese igual que alguien con doscientas.
 */

import type { NetworkLink, NetworkNode, NetworkTotals } from '@sanatorio/contracts'

import type { PairRow } from './network.repository.js'

/** Una pareja sin dirección, con los dos sentidos dentro. `a < b` siempre. */
export type Pair = { a: string; b: string; ab: number; ba: number }

/** Lo que se sabe de cada persona antes de pintarla. */
export type PersonStats = Omit<NetworkNode, 'image' | 'cohort'>

export type Analysis = {
  pairs: Pair[]
  people: Map<string, PersonStats>
  totals: NetworkTotals
}

/** Vueltas de la propagación de etiquetas. Converge mucho antes casi siempre. */
const COMMUNITY_ROUNDS = 12

/**
 * Junta los dos sentidos de cada pareja.
 *
 * Quien no es del campus solo interesa como vecino de quien sí lo es: una
 * pareja de dos personas de fuera se descarta.
 */
export function mergePairs(rows: readonly PairRow[], members: ReadonlySet<string>): Pair[] {
  const pairs = new Map<string, Pair>()

  for (const row of rows) {
    if (!members.has(row.corrector) && !members.has(row.corrected)) {
      continue
    }

    const forward = row.corrector < row.corrected
    const a = forward ? row.corrector : row.corrected
    const b = forward ? row.corrected : row.corrector
    const key = `${a}\n${b}`
    const pair = pairs.get(key) ?? { a, b, ab: 0, ba: 0 }

    if (forward) {
      pair.ab += row.count
    } else {
      pair.ba += row.count
    }

    pairs.set(key, pair)
  }

  return [...pairs.values()]
}

/** Comunidades por propagación de etiquetas, con el peso de cada unión. */
function communitiesOf(pairs: readonly Pair[], logins: readonly string[]): Map<string, number> {
  const neighbours = new Map<string, { login: string; weight: number }[]>()
  const link = (from: string, to: string, weight: number): void => {
    const list = neighbours.get(from)

    if (list === undefined) {
      neighbours.set(from, [{ login: to, weight }])
    } else {
      list.push({ login: to, weight })
    }
  }

  for (const pair of pairs) {
    link(pair.a, pair.b, pair.ab + pair.ba)
    link(pair.b, pair.a, pair.ab + pair.ba)
  }

  // Orden fijo (alfabético) para que el mismo grafo dé siempre lo mismo.
  const order = [...logins].sort()
  const label = new Map(order.map((login, index) => [login, index]))

  for (let round = 0; round < COMMUNITY_ROUNDS; round += 1) {
    let changed = 0

    for (const login of order) {
      const votes = new Map<number, number>()

      for (const neighbour of neighbours.get(login) ?? []) {
        const theirs = label.get(neighbour.login) ?? 0

        votes.set(theirs, (votes.get(theirs) ?? 0) + neighbour.weight)
      }

      let best = label.get(login) ?? 0
      let bestWeight = votes.get(best) ?? 0

      for (const [candidate, weight] of votes) {
        // A igualdad de votos gana la etiqueta menor: sin azar.
        if (weight > bestWeight || (weight === bestWeight && candidate < best)) {
          best = candidate
          bestWeight = weight
        }
      }

      if (best !== label.get(login)) {
        label.set(login, best)
        changed += 1
      }
    }

    if (changed === 0) {
      break
    }
  }

  // Se renumeran por tamaño: la 0 es la mayor.
  const sizes = new Map<number, number>()

  for (const value of label.values()) {
    sizes.set(value, (sizes.get(value) ?? 0) + 1)
  }

  const rank = new Map(
    [...sizes.entries()]
      .sort((x, y) => y[1] - x[1] || x[0] - y[0])
      .map(([value], index) => [value, index]),
  )

  return new Map([...label].map(([login, value]) => [login, rank.get(value) ?? 0]))
}

const round3 = (value: number): number => Math.round(value * 1000) / 1000

/** Todas las cuentas de un conjunto de parejas. */
export function analyse(pairs: readonly Pair[], members: ReadonlySet<string>): Analysis {
  type Tally = { given: number; received: number; partners: number; mutual: number }
  const tallies = new Map<string, Tally>()
  const tally = (login: string): Tally => {
    let entry = tallies.get(login)

    if (entry === undefined) {
      entry = { given: 0, received: 0, partners: 0, mutual: 0 }
      tallies.set(login, entry)
    }

    return entry
  }

  let corrections = 0
  let mutualPairs = 0

  for (const pair of pairs) {
    const a = tally(pair.a)
    const b = tally(pair.b)
    const mutual = 2 * Math.min(pair.ab, pair.ba)

    a.given += pair.ab
    a.received += pair.ba
    b.given += pair.ba
    b.received += pair.ab
    a.partners += 1
    b.partners += 1
    a.mutual += mutual
    b.mutual += mutual
    corrections += pair.ab + pair.ba

    if (mutual > 0) {
      mutualPairs += 1
    }
  }

  const community = communitiesOf(pairs, [...tallies.keys()])
  const people = new Map<string, PersonStats>()
  let weight = 0
  let repetitionSum = 0
  let reciprocitySum = 0

  for (const [login, entry] of tallies) {
    const total = entry.given + entry.received
    const repetition = total === 0 ? 0 : (total - entry.partners) / total
    const reciprocity = total === 0 ? 0 : entry.mutual / total

    people.set(login, {
      login,
      external: !members.has(login),
      given: entry.given,
      received: entry.received,
      partners: entry.partners,
      repetition: round3(repetition),
      reciprocity: round3(reciprocity),
      endogamy: Math.round(50 * (repetition + reciprocity)),
      community: community.get(login) ?? 0,
    })

    // La media del campus es de su gente: quien viene de fuera no cuenta.
    if (members.has(login)) {
      weight += total
      repetitionSum += repetition * total
      reciprocitySum += reciprocity * total
    }
  }

  const repetition = weight === 0 ? 0 : repetitionSum / weight
  const reciprocity = weight === 0 ? 0 : reciprocitySum / weight

  return {
    pairs: [...pairs],
    people,
    totals: {
      corrections,
      people: people.size,
      pairs: pairs.length,
      mutualPairs,
      repetition: round3(repetition),
      reciprocity: round3(reciprocity),
      endogamy: Math.round(50 * (repetition + reciprocity)),
      communities: new Set(community.values()).size,
    },
  }
}

/** Una pareja como unión del grafo. */
export function toLink(pair: Pair): NetworkLink {
  return { source: pair.a, target: pair.b, forth: pair.ab, back: pair.ba }
}

const weightOf = (pair: Pair): number => pair.ab + pair.ba

/**
 * Qué se pinta de un análisis.
 *
 * Con `focus`, la persona, quienes se han cruzado con ella y las uniones entre
 * todos. Sin él, las personas más activas. En los dos casos, solo las uniones
 * con al menos `min` correcciones, y como mucho `limit` personas.
 */
export function select(
  analysis: Analysis,
  options: { focus: string | null; min: number; limit: number },
): { logins: string[]; links: NetworkLink[]; hidden: { nodes: number; links: number } | null } {
  const { focus, min, limit } = options
  const strong = analysis.pairs.filter((pair) => weightOf(pair) >= min)
  const activity = (login: string): number => {
    const person = analysis.people.get(login)

    return person === undefined ? 0 : person.given + person.received
  }
  let candidates: string[]

  if (focus === null) {
    // Solo quien tiene alguna unión que se vaya a pintar: sin ella sería un punto suelto.
    candidates = [...new Set(strong.flatMap((pair) => [pair.a, pair.b]))]
  } else {
    const around = new Set<string>([focus])

    for (const pair of strong) {
      if (pair.a === focus) around.add(pair.b)
      if (pair.b === focus) around.add(pair.a)
    }

    candidates = analysis.people.has(focus) ? [...around] : []
  }

  // La persona elegida va siempre; el resto, por actividad.
  candidates.sort(
    (x, y) =>
      Number(y === focus) - Number(x === focus) || activity(y) - activity(x) || (x < y ? -1 : 1),
  )

  const logins = candidates.slice(0, limit)
  const shown = new Set(logins)
  const inside = strong.filter((pair) => shown.has(pair.a) && shown.has(pair.b))
  // Tope de uniones: con demasiadas el grafo es una mancha y el navegador sufre.
  const maxLinks = Math.max(200, limit * 6)
  const kept =
    inside.length > maxLinks
      ? [...inside].sort((x, y) => weightOf(y) - weightOf(x)).slice(0, maxLinks)
      : inside
  const hiddenNodes = candidates.length - logins.length
  const hiddenLinks = inside.length - kept.length

  return {
    logins,
    links: kept.map(toLink),
    hidden: hiddenNodes > 0 || hiddenLinks > 0 ? { nodes: hiddenNodes, links: hiddenLinks } : null,
  }
}
