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
 * 1·4S (la fila de atrás). Los pesos de abajo siguen ese orden. Para un puesto
 * sur es lo mismo hacia la fila de arriba, así que el peso vale igual en los
 * dos sentidos.
 */

import { parseHost } from '../map/index.js'
import type { SeatPosition } from '../map/index.js'

/** Lo que pesa cada vecino. Cambiarlos aquí recalcula todo desde el historial. */
const SEAT_WEIGHTS = { beside: 3, across: 2, behind: 1.5 } as const

/** Lo cerca que se sientan dos puestos: 0 si no cuentan como cerca. */
export function seatWeight(a: SeatPosition, b: SeatPosition): number {
  if (a.cluster !== b.cluster || a.separator !== b.separator) return 0

  const gap = Math.abs(a.seat - b.seat)

  if (a.row === b.row) {
    if (gap === 2) return SEAT_WEIGHTS.beside
    if (gap === 1) return SEAT_WEIGHTS.across

    return 0
  }

  // El de atrás: un norte mira a la fila de abajo; un sur, a la de arriba.
  const back = a.seat % 2 === 1 ? a.row - 1 : a.row + 1

  return b.row === back && gap === 1 ? SEAT_WEIGHTS.behind : 0
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
export function seatingOf(sessions: readonly SeatSession[]): Seating {
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

      const weight = seatWeight(position, other.position)

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
