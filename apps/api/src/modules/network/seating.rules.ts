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

import { breathe } from '../../core/breathe.js'
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
  /** Sus puestos de siempre: los tres con más horas, de más a menos. */
  usual: string[]
}

type PairSeating = { a: string; b: string; closeness: number; hours: number }

type Seating = { people: Map<string, PersonSeating>; pairs: PairSeating[] }

const HOUR_MS = 3_600_000

/** Sesiones que se miran seguidas antes de dejar pasar a las demás peticiones. */
const BATCH = 20_000

/** Los puestos de siempre que se cuentan de cada persona. */
const USUAL = 3

/**
 * Para la clave numérica de una pareja (`a · PAIR_KEY + b`): más personas que
 * esto no tiene ningún campus, y el producto sigue siendo un entero exacto.
 */
const PAIR_KEY = 2 ** 21

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

/** Los `USUAL` puestos con más horas, de más a menos. */
function usualOf(hosts: ReadonlyMap<string, number>): string[] {
  return [...hosts]
    .sort((x, y) => y[1] - x[1])
    .slice(0, USUAL)
    .map(([host]) => host)
}

/**
 * Las cuentas de un historial de sesiones: por persona y por pareja. Las
 * sesiones en un puesto que no sigue el patrón de nombre cuentan como horas,
 * pero sin vecinos.
 *
 * Con todo el historial de un campus grande son millones de sesiones y cientos
 * de miles de parejas: cada persona y cada pareja se guardan con un número, y
 * de cada sesión solo se recuerda con quién coincidió mientras sigue abierta.
 * Copiarlas todas con esa lista dejaba sin memoria al servidor con París.
 */
export async function seatingOf(
  sessions: readonly SeatSession[],
  weights: SeatWeights = DEFAULT_SEAT_WEIGHTS,
): Promise<Seating> {
  // Hay cientos de puestos y cientos de miles de sesiones: cada puesto se lee una vez.
  const positions = new Map<string, SeatPosition | null>()
  const positionOf = (host: string): SeatPosition | null => {
    let position = positions.get(host)

    if (position === undefined) {
      position = parseHost(host)
      positions.set(host, position)
    }

    return position
  }
  const logins: string[] = []
  const ids = new Map<string, number>()
  const idOf = (login: string): number => {
    let id = ids.get(login)

    if (id === undefined) {
      id = logins.length
      logins.push(login)
      ids.set(login, id)
    }

    return id
  }
  const hours: number[] = []
  const aloneHours: number[] = []
  const hostsOf: Map<string, number>[] = []
  /** Lo que queda de una sesión: sus horas, su puesto y sus horas solas. */
  const close = (person: number, session: SeatSession, near: [number, number][]): void => {
    const spent = (session.end - session.begin) / HOUR_MS
    const hosts = (hostsOf[person] ??= new Map())

    hours[person] = (hours[person] ?? 0) + spent
    aloneHours[person] = (aloneHours[person] ?? 0) + spent - covered(near) / HOUR_MS
    hosts.set(session.host, (hosts.get(session.host) ?? 0) + spent)
  }

  const sorted = sessions.filter((session) => session.end > session.begin)

  sorted.sort((x, y) => x.begin - y.begin)
  await breathe()

  type Open = {
    session: SeatSession
    person: number
    position: SeatPosition
    near: [number, number][]
  }
  // Cada pareja, por su clave: en qué sitio de las listas de abajo están sus cuentas.
  const pairAt = new Map<number, number>()
  const pairA: number[] = []
  const pairB: number[] = []
  const pairHours: number[] = []
  const pairCloseness: number[] = []
  // Las sesiones abiertas a la vez, por clúster: solo esas pueden ser vecinas.
  const open = new Map<string, Open[]>()

  for (const [index, session] of sorted.entries()) {
    // Con todo el historial son cientos de miles: se deja pasar al resto de la web.
    if (index % BATCH === BATCH - 1) await breathe()

    const person = idOf(session.login)
    const position = positionOf(session.host)

    if (position === null) {
      close(person, session, [])
      continue
    }

    const room = `${position.cluster}|${position.separator}`
    const still: Open[] = []
    const mine: Open = { session, person, position, near: [] }

    for (const other of open.get(room) ?? []) {
      // Ya acabó: ninguna de las que faltan (empiezan más tarde) puede pisarla.
      if (other.session.end <= session.begin) {
        close(other.person, other.session, other.near)
        continue
      }

      still.push(other)

      if (other.person === person) continue

      const weight = seatWeight(position, other.position, weights)

      if (weight === 0) continue

      const from = session.begin
      const to = Math.min(session.end, other.session.end)

      mine.near.push([from, to])
      other.near.push([from, to])

      const [a, b] =
        session.login < other.session.login ? [person, other.person] : [other.person, person]
      const key = a * PAIR_KEY + b
      let at = pairAt.get(key)

      if (at === undefined) {
        at = pairA.length
        pairAt.set(key, at)
        pairA.push(a)
        pairB.push(b)
        pairHours.push(0)
        pairCloseness.push(0)
      }

      pairHours[at] = (pairHours[at] ?? 0) + (to - from) / HOUR_MS
      pairCloseness[at] = (pairCloseness[at] ?? 0) + (weight * (to - from)) / HOUR_MS
    }

    still.push(mine)
    open.set(room, still)
  }

  for (const still of open.values()) {
    for (const other of still) close(other.person, other.session, other.near)
  }

  await breathe()

  const closeness = new Array<number>(logins.length).fill(0)
  const partners = new Array<number>(logins.length).fill(0)
  const pairs: PairSeating[] = []

  for (const [at, a] of pairA.entries()) {
    const b = pairB[at] ?? 0
    const value = pairCloseness[at] ?? 0

    closeness[a] = (closeness[a] ?? 0) + value
    closeness[b] = (closeness[b] ?? 0) + value
    partners[a] = (partners[a] ?? 0) + 1
    partners[b] = (partners[b] ?? 0) + 1
    pairs.push({
      a: logins[a] ?? '',
      b: logins[b] ?? '',
      closeness: value,
      hours: pairHours[at] ?? 0,
    })
  }

  const people = new Map<string, PersonSeating>()

  for (const [person, login] of logins.entries()) {
    people.set(login, {
      hours: hours[person] ?? 0,
      closeness: closeness[person] ?? 0,
      partners: partners[person] ?? 0,
      aloneHours: aloneHours[person] ?? 0,
      usual: usualOf(hostsOf[person] ?? new Map()),
    })
  }

  return { people, pairs }
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
