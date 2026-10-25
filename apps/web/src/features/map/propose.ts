/**
 * Proponer puestos para una terapia: el bloque de `count` puestos juntos que
 * mejor encaja.
 *
 * Solo valen puestos libres ahora mismo, que nadie haya dicho que están rotos
 * y que no choquen con otra reserva (`blocked`). Juntos quiere decir lo mismo
 * que al elegirlos a mano: cada uno toca a otro del bloque, de lado, delante,
 * detrás o en diagonal. Se prefieren las filas enteras a las columnas (se
 * habla mejor al lado que delante), los bloques apretados y, si quien elige
 * está sentado, los que le quedan más cerca.
 */

import type { ClusterMap, MapSeat } from '@sanatorio/contracts'

/** Cuánto pesa una fila de distancia frente a un puesto de lado. */
const ROW_WEIGHT = 2
/** Un bloque en otro cluster que el de quien elige siempre queda detrás. */
const OTHER_CLUSTER = 1000

type Cell = { host: string; row: number; seat: number }

const key = (row: number, seat: number): string => `${row}:${seat}`

/** El bloque de `count` puestos que crece desde `start`, o `null` si no cabe. */
function grow(start: Cell, count: number, free: ReadonlyMap<string, Cell>): Cell[] | null {
  const block = [start]
  const taken = new Set([key(start.row, start.seat)])

  while (block.length < count) {
    let best: Cell | null = null
    let bestCost = Infinity

    for (const cell of block) {
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let ds = -1; ds <= 1; ds += 1) {
          const next = free.get(key(cell.row + dr, cell.seat + ds))

          if (next === undefined || taken.has(key(next.row, next.seat))) continue

          // Lo más cerca del primero, mejor en su fila.
          const cost =
            Math.abs(next.seat - start.seat) + ROW_WEIGHT * Math.abs(next.row - start.row)

          if (cost < bestCost || (cost === bestCost && best !== null && next.seat < best.seat)) {
            best = next
            bestCost = cost
          }
        }
      }
    }

    if (best === null) return null

    block.push(best)
    taken.add(key(best.row, best.seat))
  }

  return block
}

/** Lo que cuesta un bloque: lo que ocupa y lo lejos que queda de quien elige. */
function cost(block: readonly Cell[], near: Cell | null, sameCluster: boolean): number {
  const rows = block.map((cell) => cell.row)
  const seats = block.map((cell) => cell.seat)
  const spread =
    Math.max(...seats) - Math.min(...seats) + ROW_WEIGHT * (Math.max(...rows) - Math.min(...rows))

  if (near === null) return spread
  if (!sameCluster) return OTHER_CLUSTER + spread

  const distance = Math.min(
    ...block.map(
      (cell) => Math.abs(cell.seat - near.seat) + ROW_WEIGHT * Math.abs(cell.row - near.row),
    ),
  )

  return spread + distance
}

/**
 * Los puestos propuestos, o `null` si no hay ningún hueco de ese tamaño.
 *
 * @param blocked Puestos que no se pueden coger aunque estén libres (otra reserva).
 */
export function proposeSeats(
  map: ClusterMap,
  count: number,
  blocked: (seat: MapSeat) => boolean = () => false,
): string[] | null {
  const mine = map.clusters
    .flatMap((cluster) => cluster.seats.map((seat) => ({ cluster: cluster.id, seat })))
    .find(({ seat }) => seat.occupant?.me === true)
  const near: Cell | null =
    mine === undefined ? null : { host: mine.seat.host, row: mine.seat.row, seat: mine.seat.seat }
  let best: { hosts: string[]; cost: number } | null = null

  for (const cluster of map.clusters) {
    const free = new Map<string, Cell>()

    for (const seat of cluster.seats) {
      if (seat.occupant === null && !seat.taken && seat.broken === null && !blocked(seat)) {
        free.set(key(seat.row, seat.seat), { host: seat.host, row: seat.row, seat: seat.seat })
      }
    }

    for (const start of free.values()) {
      const block = grow(start, count, free)

      if (block === null) continue

      const value = cost(block, near, mine?.cluster === cluster.id)

      if (best === null || value < best.cost) {
        best = {
          hosts: block
            .map((cell) => cell.host)
            .sort((a, b) => a.localeCompare(b, 'en', { numeric: true })),
          cost: value,
        }
      }
    }
  }

  return best?.hosts ?? null
}
