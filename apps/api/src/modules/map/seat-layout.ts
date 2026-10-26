/**
 * Dónde cae un puesto dentro de su cluster, a partir de su nombre.
 *
 * La API de 42 no publica el plano de un campus, pero el nombre del puesto lo
 * lleva dentro: `c1r2s4` es el cluster 1, fila 2, puesto 4. Otros campus usan
 * otras letras (`e1r2p3`, `bess-f1r2s3`, en París `f1br2s8`), siempre con la
 * misma idea: un prefijo que es la sala, una fila y una posición.
 *
 * Lo que 42 da como «puesto» no siempre lo es: cuentas del staff y bots (como
 * norminet) salen sentados en `POISSON POISSON 🐟`, `Hogwarts` o `bocal`. Eso
 * no se coloca (`parseHost` da `null`) y no forma clúster. Y una errata en el
 * número (`f1r13s93` en un clúster de 23 puestos por fila) no puede convertir
 * el plano en una cuadrícula gigante: `clusterBounds` deja fuera lo que queda
 * demasiado lejos del resto (`docs/asientos.md`, «Clústeres grandes»).
 */

export type SeatPosition = {
  /** Prefijo que identifica la sala (`c1`, `bess-f1`). */
  cluster: string
  row: number
  seat: number
  /** Letra que separa fila y puesto en ese campus: `s` (`c1r2s4`) o `p` (`c3r7p7`). */
  separator: 's' | 'p'
}

/** Fila y posición al final del nombre; lo de antes es el cluster. */
const HOST = /^(.+?)r(\d{1,2})([sp])(\d{1,2})$/

/**
 * Cómo se llama un clúster: letras, números y guiones, empezando por letra o
 * número (`c1`, `f1b`, `bess-f1`). Con espacios, emojis o cualquier otra cosa
 * no es una sala sino el «puesto» de broma de una cuenta del staff.
 */
const CLUSTER = /^[a-z0-9][a-z0-9-]{0,15}$/

/** Posición de un puesto, o `null` si el nombre no sigue ese patrón. */
export function parseHost(host: string): SeatPosition | null {
  const match = HOST.exec(host.trim().toLowerCase())

  if (match === null) {
    return null
  }

  const [, cluster = '', row = '', separator = 's', seat = ''] = match
  const position: SeatPosition = {
    cluster,
    row: Number(row),
    seat: Number(seat),
    separator: separator === 'p' ? 'p' : 's',
  }

  // La fila o el puesto 0 no existen en ningún campus conocido: si salen, el
  // nombre es otra cosa que casualmente termina igual.
  return position.row > 0 && position.seat > 0 && CLUSTER.test(cluster) ? position : null
}

/**
 * Filas o puestos por fila que se admiten como mucho en un clúster. Los más
 * grandes que se conocen (París) rondan 14 × 23; por encima de esto, el número
 * es una errata.
 */
const MAX_LINE = 50

/** Salto que siempre se admite entre dos números vistos, aunque el clúster sea pequeño. */
const MIN_JUMP = 10

/**
 * Hasta dónde llega un clúster en una dirección (filas o puestos), dados los
 * números que se han visto: del más pequeño hacia arriba, cada número entra si
 * no pasa de doblar lo que ya mide el clúster, más `MIN_JUMP`. Así un clúster
 * del que se ha visto poco (en producción hay campus con filas 1, 8, 15 y 16
 * vistas, o 2, 11, 14 y 16) crece con lo que se ve, pero una fila 45 suelta en
 * uno de 13 se queda fuera. Nunca pasa de `MAX_LINE`.
 */
function extent(values: Iterable<number>): number {
  const sorted = [...new Set(values)].filter((value) => value <= MAX_LINE).sort((a, b) => a - b)
  let limit = sorted[0] ?? 0

  for (const value of sorted.slice(1)) {
    if (value > 2 * limit + MIN_JUMP) break
    limit = value
  }

  return limit
}

/**
 * El tamaño de cada clúster (filas y puestos por fila) y la letra de sus
 * puestos, a partir de los puestos vistos. Lo que caiga fuera (`isInside`) es
 * una errata y no se dibuja: el plano se completa solo dentro de esto.
 */
export function clusterBounds(positions: Iterable<SeatPosition>): Map<string, SeatPosition> {
  const seen = new Map<string, { separator: 's' | 'p'; rows: number[]; seats: number[] }>()

  for (const position of positions) {
    const entry = seen.get(position.cluster) ?? {
      separator: position.separator,
      rows: [],
      seats: [],
    }

    entry.rows.push(position.row)
    entry.seats.push(position.seat)
    seen.set(position.cluster, entry)
  }

  const bounds = new Map<string, SeatPosition>()

  for (const [cluster, entry] of seen) {
    bounds.set(cluster, {
      cluster,
      separator: entry.separator,
      row: extent(entry.rows),
      seat: extent(entry.seats),
    })
  }

  return bounds
}

/** Si un puesto cae dentro del tamaño de su clúster (y no es una errata). */
export function isInside(
  position: SeatPosition,
  bounds: ReadonlyMap<string, SeatPosition>,
): boolean {
  const limit = bounds.get(position.cluster)

  return limit !== undefined && position.row <= limit.row && position.seat <= limit.seat
}

/** El nombre del puesto que está en esa posición: lo contrario de `parseHost`. */
export function hostAt(position: SeatPosition): string {
  return `${position.cluster}r${position.row}${position.separator}${position.seat}`
}
