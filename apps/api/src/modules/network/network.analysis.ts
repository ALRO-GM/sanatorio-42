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
export type PersonStats = Omit<
  NetworkNode,
  'image' | 'cohort' | 'campusId' | 'givenPassRate' | 'receivedPassRate'
>

export type Analysis = {
  pairs: Pair[]
  people: Map<string, PersonStats>
  totals: NetworkTotals
}

/** Niveles de agrupación y pasadas por nivel de Louvain. Converge mucho antes casi siempre. */
const LOUVAIN_LEVELS = 12
const LOUVAIN_PASSES = 24

/** Por debajo de esto dos ganancias se consideran iguales (errores de coma flotante). */
const EPSILON = 1e-9

/**
 * Login de una cuenta borrada: 42 lo sustituye por `3b3-` y un número. Fueron
 * estudiantes del campus (sus correcciones se hicieron aquí), así que no se
 * tratan como gente de fuera aunque ya no estén en la réplica.
 */
export function isAnonymised(login: string): boolean {
  return /^3b3-\d+$/.test(login)
}

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

/**
 * Comunidades por el método de Louvain: grupos de gente que se corrige más
 * entre sí de lo que tocaría por azar.
 *
 * Dos pasos que se repiten: mover cada persona a la comunidad vecina que más
 * sube la modularidad, y después tratar cada comunidad como una sola burbuja y
 * volver a empezar. Para cuando ya no hay movimiento que mejore.
 *
 * Sin azar: el orden es siempre el alfabético y los empates los gana el número
 * menor, así que el mismo grafo da siempre las mismas comunidades.
 */
export function communitiesOf(
  pairs: readonly Pair[],
  logins: readonly string[],
): Map<string, number> {
  const order = [...logins].sort()
  const indexOf = new Map(order.map((login, index) => [login, index]))
  // A qué burbuja del nivel actual pertenece cada persona.
  const membership = order.map((_, index) => index)
  let size = order.length
  let edges = new Map<number, number>()
  const key = (a: number, b: number): number => (a < b ? a * size + b : b * size + a)

  for (const pair of pairs) {
    const a = indexOf.get(pair.a)
    const b = indexOf.get(pair.b)

    if (a !== undefined && b !== undefined) {
      edges.set(key(a, b), (edges.get(key(a, b)) ?? 0) + pair.ab + pair.ba)
    }
  }

  for (let level = 0; level < LOUVAIN_LEVELS; level += 1) {
    const neighbours: { to: number; weight: number }[][] = Array.from({ length: size }, () => [])
    // Peso que toca cada burbuja; un lazo (peso dentro de ella) cuenta doble.
    const degree = new Array<number>(size).fill(0)
    let total = 0

    for (const [code, weight] of edges) {
      const a = Math.floor(code / size)
      const b = code % size

      total += weight

      if (a === b) {
        degree[a] = (degree[a] ?? 0) + 2 * weight
      } else {
        neighbours[a]?.push({ to: b, weight })
        neighbours[b]?.push({ to: a, weight })
        degree[a] = (degree[a] ?? 0) + weight
        degree[b] = (degree[b] ?? 0) + weight
      }
    }

    if (total === 0) {
      break
    }

    const community = Array.from({ length: size }, (_, index) => index)
    const weightIn = [...degree]
    let moved = false

    for (let pass = 0; pass < LOUVAIN_PASSES; pass += 1) {
      let changes = 0

      for (let node = 0; node < size; node += 1) {
        const own = community[node] ?? node
        const mine = degree[node] ?? 0
        const towards = new Map<number, number>()

        for (const neighbour of neighbours[node] ?? []) {
          const theirs = community[neighbour.to] ?? neighbour.to

          towards.set(theirs, (towards.get(theirs) ?? 0) + neighbour.weight)
        }

        // Se saca de su comunidad y se mira dónde ganaría más (puede ser la misma).
        weightIn[own] = (weightIn[own] ?? 0) - mine

        let best = own
        let bestGain = (towards.get(own) ?? 0) - ((weightIn[own] ?? 0) * mine) / (2 * total)

        for (const [candidate, weight] of towards) {
          const gain = weight - ((weightIn[candidate] ?? 0) * mine) / (2 * total)

          if (
            gain > bestGain + EPSILON ||
            (Math.abs(gain - bestGain) <= EPSILON && candidate < best)
          ) {
            best = candidate
            bestGain = gain
          }
        }

        weightIn[best] = (weightIn[best] ?? 0) + mine

        if (best !== own) {
          community[node] = best
          changes += 1
        }
      }

      if (changes === 0) {
        break
      }

      moved = true
    }

    if (!moved) {
      break
    }

    // Cada comunidad pasa a ser una burbuja del nivel siguiente.
    const renumber = new Map<number, number>()

    for (const value of community) {
      if (!renumber.has(value)) {
        renumber.set(value, renumber.size)
      }
    }

    const nextSize = renumber.size
    const next = new Map<number, number>()

    for (const [code, weight] of edges) {
      const a = renumber.get(community[Math.floor(code / size)] ?? 0) ?? 0
      const b = renumber.get(community[code % size] ?? 0) ?? 0
      const merged = a < b ? a * nextSize + b : b * nextSize + a

      next.set(merged, (next.get(merged) ?? 0) + weight)
    }

    for (let person = 0; person < membership.length; person += 1) {
      membership[person] = renumber.get(community[membership[person] ?? 0] ?? 0) ?? 0
    }

    if (nextSize === size) {
      break
    }

    edges = next
    size = nextSize
  }

  // Se renumeran por tamaño: la 0 es la mayor.
  const sizes = new Map<number, number>()

  for (const value of membership) {
    sizes.set(value, (sizes.get(value) ?? 0) + 1)
  }

  const rank = new Map(
    [...sizes.entries()]
      .sort((x, y) => y[1] - x[1] || x[0] - y[0])
      .map(([value], index) => [value, index]),
  )

  return new Map(order.map((login, index) => [login, rank.get(membership[index] ?? 0) ?? 0]))
}

const round3 = (value: number): number => Math.round(value * 1000) / 1000

/** Notas mínimas habituales en 42, de más a menos exigente. */
const USUAL_PASS_MARKS = [100, 80, 75, 50] as const

/** Ningún proyecto se da por bueno con menos que esto. */
const LOWEST_PASS_MARK = 50

/** Nota mínima que se supone a un proyecto del que no hay ningún dato. */
export const DEFAULT_PASS_MARK = 80

/** La nota que deja por debajo a esa parte (0-1) de la gente. */
function percentile(marks: readonly { mark: number; people: number }[], share: number): number {
  const sorted = [...marks].sort((a, b) => a.mark - b.mark)
  const target = share * sorted.reduce((sum, entry) => sum + entry.people, 0)
  let seen = 0

  for (const entry of sorted) {
    seen += entry.people

    if (seen > target) {
      return entry.mark
    }
  }

  return sorted.at(-1)?.mark ?? 0
}

/**
 * La nota mínima de un proyecto, deducida de cómo ha acabado la gente.
 *
 * La API no la publica, pero se ve en los datos: nadie valida por debajo de
 * ella. Se toma la nota más baja con la que se ha validado (sin el 1 % de casos
 * raros: validaciones a mano del staff) y se baja a la mínima habitual más
 * cercana, porque que nadie haya validado con un 85 no significa que no se
 * pueda. Si con eso habría suspensos "aprobados", se queda la nota tal cual.
 *
 * @param validated Notas finales de quien lo validó, con cuánta gente cada una.
 * @param failed    Notas finales de quien lo terminó sin validarlo.
 * @returns `null` si nadie lo ha validado: no hay de dónde deducirla.
 */
export function passMarkOf(
  validated: readonly { mark: number; people: number }[],
  failed: readonly { mark: number; people: number }[],
): number | null {
  if (validated.length === 0) {
    return null
  }

  const lowest = percentile(validated, 0.01)
  const usual = USUAL_PASS_MARKS.find((mark) => mark <= lowest) ?? lowest
  // Lo más alto con lo que se ha suspendido, sin el 1 % de casos raros.
  const highestFail = failed.length === 0 ? -1 : percentile(failed, 0.99)

  // Por debajo de 50 no hay mínima que valga: son proyectos que se validan a
  // mano (prácticas, exámenes antiguos) y su nota final no dice nada.
  return Math.max(LOWEST_PASS_MARK, usual > highestFail ? usual : lowest)
}

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
 * Tope del grafo de asientos (`seating.service.ts`): burbujas y uniones. Con más,
 * el grafo es una mancha y la simulación de la web (que mueve cada burbuja a cada
 * paso) se come la CPU: con 3 600 personas y 11 000 uniones, arrastrar una
 * burbuja tenía el hilo de la página al 98 % (medido en `docs/architecture.md`,
 * «Red de correcciones»). El de correcciones deja elegir más, hasta «todas»
 * (`select`): quien lo pide sabe que irá más lento.
 */
export const GRAPH_BUDGET = { nodes: 1500, links: 10_000 } as const

/** Uniones por burbuja que se pintan como mucho: se quedan las más fuertes. */
const LINKS_PER_NODE = 6

/**
 * Qué se pinta de un análisis.
 *
 * Con `focus`, la persona, quienes se han cruzado con ella y las uniones entre
 * todos. Sin él, las personas más activas. En los dos casos, solo las uniones
 * con al menos `min` correcciones (y, con `mutual`, solo las que van en los dos
 * sentidos), y como mucho `limit` personas.
 */
export function select(
  analysis: Analysis,
  options: { focus: string | null; min: number; limit: number; mutual?: boolean },
): { logins: string[]; links: NetworkLink[]; hidden: { nodes: number; links: number } | null } {
  const { focus, min, limit } = options
  const strong = analysis.pairs.filter(
    (pair) => weightOf(pair) >= min && (options.mutual !== true || (pair.ab > 0 && pair.ba > 0)),
  )
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
  const maxLinks = Math.max(200, logins.length * LINKS_PER_NODE)
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
