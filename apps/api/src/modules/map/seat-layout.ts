/**
 * Dónde cae un puesto dentro de su cluster, a partir de su nombre.
 *
 * La API de 42 no publica el plano de un campus, pero el nombre del puesto lo
 * lleva dentro: `c1r2s4` es el cluster 1, fila 2, puesto 4. Otros campus usan
 * otras letras (`e1r2p3`, `bess-f1r2s3`), siempre con la misma idea: un prefijo
 * que es la sala, una fila y una posición.
 */

export type SeatPosition = {
  /** Prefijo que identifica la sala (`c1`, `bess-f1`). */
  cluster: string
  row: number
  seat: number
}

/** Fila y posición al final del nombre; lo de antes es el cluster. */
const HOST = /^(.+?)r(\d{1,2})[sp](\d{1,2})$/

/** Posición de un puesto, o `null` si el nombre no sigue ese patrón. */
export function parseHost(host: string): SeatPosition | null {
  const match = HOST.exec(host.trim().toLowerCase())

  if (match === null) {
    return null
  }

  const [, cluster = '', row = '', seat = ''] = match
  const position = { cluster, row: Number(row), seat: Number(seat) }

  // La fila o el puesto 0 no existen en ningún campus conocido: si salen, el
  // nombre es otra cosa que casualmente termina igual.
  return position.row > 0 && position.seat > 0 ? position : null
}
