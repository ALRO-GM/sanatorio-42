/**
 * El mapa de calor de los puestos (`docs/asientos.md`): cuántas horas se ha
 * usado cada ordenador de los clústeres y por cuánta gente distinta. Solo
 * cuentas: no dice quién.
 */

import type { SeatHeatCell, SeatHeatCluster } from '@sanatorio/contracts'

import { clusterBounds, hostAt, parseHost } from '../map/index.js'
import type { SeatSession } from './seating.rules.js'

const HOUR_MS = 3_600_000

const round1 = (value: number): number => Math.round(value * 10) / 10

type Usage = { ms: number; people: Set<string> }

const emptyUsage = (): Usage => ({ ms: 0, people: new Set<string>() })

/**
 * Las horas y la gente de cada puesto, por clúster. El plano se completa como
 * en el mapa (`map.service.ts`): dentro del rectángulo de los puestos conocidos
 * de cada clúster, los que faltan salen con 0. Lo que no sigue el patrón de
 * nombre de puesto (`parseHost`) no se puede colocar y no sale.
 *
 * Cada clúster lleva también sus horas y su gente. La gente se cuenta aquí,
 * con los logins, y no sumando la de sus puestos: quien se sienta en tres
 * puestos del clúster es una persona, no tres.
 */
export function seatHeatOf(
  sessions: readonly SeatSession[],
  known: readonly string[],
): { clusters: SeatHeatCluster[]; max: number } {
  const usage = new Map<string, Usage>()
  const byCluster = new Map<string, Usage>()

  for (const session of sessions) {
    const host = session.host.trim().toLowerCase()
    const position = parseHost(host)

    // Lo que no se puede colocar en un plano no cuenta en ningún clúster.
    if (position === null) continue

    for (const [map, key] of [
      [usage, host],
      [byCluster, position.cluster],
    ] as const) {
      const entry = map.get(key) ?? emptyUsage()

      entry.ms += session.end - session.begin
      entry.people.add(session.login)
      map.set(key, entry)
    }
  }

  const counted = (map: Map<string, Usage>): Map<string, SeatTotal> =>
    new Map([...map].map(([key, entry]) => [key, { ms: entry.ms, people: entry.people.size }]))

  return seatHeatFrom(counted(usage), counted(byCluster), known)
}

/** Lo usado de un puesto o de un clúster: tiempo y gente distinta. */
export type SeatTotal = { ms: number; people: number }

/**
 * El mapa de calor con lo usado ya sumado: por puesto (en minúsculas) y por
 * clúster. Es lo que sale de `seat_usage` (`seating.usage.ts`) sin pasar por
 * las sesiones, y lo que acaba haciendo `seatHeatOf` con ellas.
 */
export function seatHeatFrom(
  usage: ReadonlyMap<string, SeatTotal>,
  byCluster: ReadonlyMap<string, SeatTotal>,
  known: readonly string[],
): { clusters: SeatHeatCluster[]; max: number } {
  // El tamaño de cada clúster y la letra de sus puestos (`s` o `p`), como en
  // el mapa: un puesto con una errata en el número no agranda la cuadrícula
  // (`clusterBounds`). Sus horas siguen en las cuentas del clúster.
  const bounds = clusterBounds(
    [...known, ...usage.keys()]
      .map((host) => parseHost(host))
      .filter((position) => position !== null),
  )

  let max = 0
  const clusters = [...bounds.values()]
    // Un clúster del que solo se han visto erratas no se dibuja.
    .filter((limit) => limit.row > 0 && limit.seat > 0)
    // `numeric` para que `c10` vaya después de `c2`, como en el mapa.
    .sort((a, b) => a.cluster.localeCompare(b.cluster, 'en', { numeric: true }))
    .map((limit): SeatHeatCluster => {
      const cells: SeatHeatCell[] = []

      for (let row = 1; row <= limit.row; row += 1) {
        for (let seat = 1; seat <= limit.seat; seat += 1) {
          const host = hostAt({ ...limit, row, seat })
          const entry = usage.get(host)
          const hours = round1((entry?.ms ?? 0) / HOUR_MS)

          max = Math.max(max, hours)
          cells.push({ host, row, seat, hours, people: entry?.people ?? 0 })
        }
      }

      const total = byCluster.get(limit.cluster) ?? { ms: 0, people: 0 }

      return {
        id: limit.cluster,
        rows: limit.row,
        seatsPerRow: limit.seat,
        hours: round1(total.ms / HOUR_MS),
        people: total.people,
        cells,
      }
    })

  return { clusters, max }
}
