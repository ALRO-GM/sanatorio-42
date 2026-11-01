/**
 * Cercanía entre puestos y entre personas (`docs/asientos.md`).
 *
 * Cada fila de un clúster es una mesa larga. Viendo el plano en vertical, la
 * fila 1 es la de abajo y suben hacia arriba; en cada fila el puesto 1 es el de
 * la izquierda, los impares miran al norte y los pares al sur:
 *
 *     Fila 3: 1N 2S 3N 4S 5N 6S
 *     Fila 2: 1N 2S 3N 4S 5N 6S
 *     Fila 1: 1N 2S 3N 4S 5N 6S
 *
 * Quien se sienta con amigos suele ocupar, desde 2·3N: 2·1N y 2·5N (al lado,
 * mirando igual), luego 2·2S y 2·4S (enfrente, en diagonal), luego 1·2S y
 * 1·4S (la fila de atrás). Los pesos de siempre siguen ese orden; desde el
 * 2026-11-01 se pueden cambiar en el panel. Para un puesto sur es lo mismo
 * hacia la fila de arriba, así que el peso vale igual en los dos sentidos.
 */

import { parseHost } from '../map/index.js'
import type { SeatPosition } from '../map/index.js'

/**
 * Lo que pesa cada vecino, visto desde un puesto norte: tres filas (la de
 * delante, la suya y la de atrás) y de tres puestos a la izquierda a tres a la
 * derecha. El centro (`[1][SEAT_REACH]`) es la propia persona y no cuenta. Desde
 * un puesto sur se mira girado media vuelta (delante es la fila de abajo y la
 * izquierda, su derecha en el plano). Se cambian desde el panel
 * (`seat-weights.ts`); estos son los de siempre.
 */
export type SeatWeights = number[][]

/** Puestos que se miran a cada lado. */
export const SEAT_REACH = 3

/** Filas de la cuadrícula: delante, la suya y atrás. */
const FRONT = 0
const OWN = 1
const BEHIND = 2

/** Los de siempre: al lado 3, enfrente en diagonal 2, la fila de atrás 1,5. */
export const DEFAULT_SEAT_WEIGHTS: SeatWeights = [
  [0, 0, 0, 0, 0, 0, 0],
  [0, 3, 2, 0, 2, 3, 0],
  [0, 0, 1.5, 0, 1.5, 0, 0],
]

/** Lo que pesa `b` visto desde `a`, en la cuadrícula de `a`. */
function oneWay(a: SeatPosition, b: SeatPosition, weights: SeatWeights): number {
  // Un sur mira al revés: se gira media vuelta para verlo como un norte.
  const turn = a.seat % 2 === 1 ? 1 : -1
  const across = (b.seat - a.seat) * turn
  const rows = (b.row - a.row) * turn
  // En el plano la fila de delante de un norte es la de arriba.
  const row = rows === 1 ? FRONT : rows === 0 ? OWN : rows === -1 ? BEHIND : null

  if (row === null || Math.abs(across) > SEAT_REACH) return 0

  return weights[row]?.[across + SEAT_REACH] ?? 0
}

/**
 * Lo cerca que se sientan dos puestos: 0 si no cuentan como cerca. Si la
 * cuadrícula no es simétrica, vale la media de mirarlo desde cada uno: así
 * pesa lo mismo en los dos sentidos.
 */
export function seatWeight(
  a: SeatPosition,
  b: SeatPosition,
  weights: SeatWeights = DEFAULT_SEAT_WEIGHTS,
): number {
  if (a.cluster !== b.cluster || a.separator !== b.separator) return 0
  if (a.row === b.row && a.seat === b.seat) return 0

  return (oneWay(a, b, weights) + oneWay(b, a, weights)) / 2
}

/** Una sesión en un puesto, en milisegundos. */
export type SeatSession = { login: string; host: string; begin: number; end: number }

type PersonSeating = {
  hours: number
  closeness: number
  partners: number
  /** Horas sin nadie cerca. */
  aloneHours: number
  /** Horas en cada puesto. */
  hosts: Map<string, number>
}

type PairSeating = { a: string; b: string; closeness: number; hours: number }

type Seating = { people: Map<string, PersonSeating>; pairs: PairSeating[] }

const HOUR_MS = 3_600_000

/** Lo que mide una lista de tramos, contando una vez lo que se pisa. */
function covered(spans: [number, number][]): number {
  spans.sort((x, y) => x[0] - y[0])

  let total = 0
  let start = 0
  let end = 0

  for (const [from, to] of spans) {
    if (from > end) {
      total += end - start
      start = from
      end = to
    } else {
      end = Math.max(end, to)
    }
  }

  return total + end - start
}

/**
 * Las cuentas de un historial de sesiones: por persona y por pareja. Las
 * sesiones en un puesto que no sigue el patrón de nombre cuentan como horas,
 * pero sin vecinos.
 */
export function seatingOf(
  sessions: readonly SeatSession[],
  weights: SeatWeights = DEFAULT_SEAT_WEIGHTS,
): Seating {
  type Placed = SeatSession & { position: SeatPosition | null; near: [number, number][] }
  const placed: Placed[] = sessions
    .filter((session) => session.end > session.begin)
    .map((session) => ({ ...session, position: parseHost(session.host), near: [] }))
    .sort((x, y) => x.begin - y.begin)
  const pairs = new Map<string, PairSeating>()
  // Las sesiones abiertas a la vez, por clúster: solo esas pueden ser vecinas.
  const open = new Map<string, Placed[]>()

  for (const session of placed) {
    const { position } = session

    if (position === null) continue

    const room = `${position.cluster}|${position.separator}`
    const still = (open.get(room) ?? []).filter((other) => other.end > session.begin)

    for (const other of still) {
      if (other.login === session.login || other.position === null) continue

      const weight = seatWeight(position, other.position, weights)

      if (weight === 0) continue

      const from = session.begin
      const to = Math.min(session.end, other.end)

      session.near.push([from, to])
      other.near.push([from, to])

      const [a, b] =
        session.login < other.login ? [session.login, other.login] : [other.login, session.login]
      const key = `${a}|${b}`
      const pair = pairs.get(key) ?? { a, b, closeness: 0, hours: 0 }

      pair.hours += (to - from) / HOUR_MS
      pair.closeness += (weight * (to - from)) / HOUR_MS
      pairs.set(key, pair)
    }

    still.push(session)
    open.set(room, still)
  }

  const people = new Map<string, PersonSeating>()
  const person = (login: string): PersonSeating => {
    let entry = people.get(login)

    if (entry === undefined) {
      entry = { hours: 0, closeness: 0, partners: 0, aloneHours: 0, hosts: new Map() }
      people.set(login, entry)
    }

    return entry
  }

  for (const session of placed) {
    const entry = person(session.login)
    const hours = (session.end - session.begin) / HOUR_MS

    entry.hours += hours
    entry.aloneHours += hours - covered(session.near) / HOUR_MS
    entry.hosts.set(session.host, (entry.hosts.get(session.host) ?? 0) + hours)
  }

  for (const pair of pairs.values()) {
    for (const login of [pair.a, pair.b]) {
      const entry = person(login)

      entry.closeness += pair.closeness
      entry.partners += 1
    }
  }

  return { people, pairs: [...pairs.values()] }
}

/**
 * Lo que cabe en el grafo de asientos con un tope (`GRAPH_BUDGET` en
 * `network.analysis.ts`): las personas con más horas y, entre ellas, las uniones
 * más fuertes. Sin tope, en un campus grande y con 90 días salían miles de
 * burbujas y el navegador no daba abasto.
 */
export function trimSeating<
  P extends { login: string; hours: number },
  L extends { a: string; b: string; closeness: number },
>(
  people: readonly P[],
  pairs: readonly L[],
  budget: { nodes: number; links: number },
): { people: P[]; pairs: L[] } {
  const kept =
    people.length > budget.nodes
      ? new Set(
          [...people]
            .sort((x, y) => y.hours - x.hours || x.login.localeCompare(y.login))
            .slice(0, Math.max(0, budget.nodes))
            .map((person) => person.login),
        )
      : null
  const between =
    kept === null ? [...pairs] : pairs.filter((pair) => kept.has(pair.a) && kept.has(pair.b))

  return {
    people: kept === null ? [...people] : people.filter((person) => kept.has(person.login)),
    pairs:
      between.length > budget.links
        ? between.sort((x, y) => y.closeness - x.closeness).slice(0, Math.max(0, budget.links))
        : between,
  }
}
