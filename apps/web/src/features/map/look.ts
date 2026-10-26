/**
 * Cómo quiere ver cada cual el mapa de clusters: hacia dónde, con el círculo
 * de cada persona y a quién resaltar. Se guarda en el navegador; si no deja
 * guardar, se ve como de fábrica.
 *
 * De fábrica, como están los clusters (`docs/asientos.md`): la fila 1 abajo,
 * el puesto 1 a la izquierda, los impares mirando al norte y los pares al sur,
 * y cada puesto un poco desplazado hacia el lado contrario de su pantalla.
 */

import type { ClusterMap, MapSeat } from '@sanatorio/contracts'

/** A quién se puede resaltar respecto de quien mira. */
export type Mate = 'circle' | 'project' | 'done'

export const MATES: readonly Mate[] = ['circle', 'project', 'done']

export type MapLook = {
  /** La fila 1 arriba en vez de abajo. */
  flipRows: boolean
  /** El último puesto a la izquierda en vez del primero. */
  flipSeats: boolean
  /** Los impares miran al sur y los pares al norte. */
  flipFacing: boolean
  /** Los puestos alineados, sin el desplazamiento de hacia dónde miran. */
  flat: boolean
  /** El número del círculo en la esquina de cada puesto ocupado. */
  circles: boolean
  /** A quién resaltar; con alguno marcado, el resto se apaga. */
  mates: Mate[]
  /**
   * Encoger los puestos para que el clúster quepa a lo ancho (de fábrica). Con
   * `false`, «100 %»: tamaño real y el plano se desliza de lado (`fit.ts`).
   */
  fit: boolean
}

/** Nota con la que un proyecto sale perfecto: brillo dorado. */
const PERFECT_MARK = 125

const KEY = 'sanatorio_map_look'

export const DEFAULT_LOOK: MapLook = {
  flipRows: false,
  flipSeats: false,
  flipFacing: false,
  flat: false,
  circles: false,
  mates: [],
  fit: true,
}

type Store = Pick<Storage, 'getItem' | 'setItem'>

function storage(): Store | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Lo que se guardó; lo que no se entienda, como de fábrica. */
export function loadLook(store: Store | null = storage()): MapLook {
  try {
    const read = JSON.parse(store?.getItem(KEY) ?? 'null') as Partial<MapLook> | null

    return {
      flipRows: read?.flipRows === true,
      flipSeats: read?.flipSeats === true,
      flipFacing: read?.flipFacing === true,
      flat: read?.flat === true,
      circles: read?.circles === true,
      mates: Array.isArray(read?.mates)
        ? MATES.filter((mate) => read.mates?.includes(mate) === true)
        : [],
      fit: read?.fit !== false,
    }
  } catch {
    return DEFAULT_LOOK
  }
}

export function saveLook(look: MapLook, store: Store | null = storage()): void {
  try {
    store?.setItem(KEY, JSON.stringify(look))
  } catch {
    // Sin guardar: la próxima vez se ve como de fábrica.
  }
}

/** Qué comparte quien ocupa un puesto con quien mira. */
export function matesOf(occupant: NonNullable<MapSeat['occupant']>, me: ClusterMap['me']): Mate[] {
  if (occupant.me) return []

  return MATES.filter((mate) =>
    mate === 'circle'
      ? me.circle !== null && occupant.circle === me.circle
      : mate === 'project'
        ? occupant.projects.some((project) => me.projects.includes(project))
        : occupant.finishedMine !== null,
  )
}

/**
 * Las clases de resaltado de un puesto: `mate-*` por lo que comparte y está
 * marcado, `perfect` si terminó un proyecto tuyo con la nota máxima, y `dim`
 * si hay algo marcado y este puesto no lo cumple.
 */
export function lookClasses(seat: MapSeat, me: ClusterMap['me'], look: MapLook): string[] {
  if (look.mates.length === 0 || seat.occupant === null) return []

  const shared = matesOf(seat.occupant, me).filter((mate) => look.mates.includes(mate))

  if (seat.occupant.me) return []
  if (shared.length === 0) return ['dim']

  return [
    ...shared.map((mate) => `mate-${mate}`),
    ...(shared.includes('done') && (seat.occupant.finishedMine ?? 0) >= PERFECT_MARK
      ? ['perfect']
      : []),
  ]
}

/** Del 1 al `count`, al derecho o dado la vuelta. */
export function order(count: number, flip: boolean): number[] {
  const all = Array.from({ length: count }, (_, index) => index + 1)

  return flip ? all.reverse() : all
}

/** Las filas de arriba abajo: de fábrica, la 1 abajo. */
export const rowsTopDown = (count: number, look: MapLook): number[] => order(count, !look.flipRows)

/**
 * Hacia dónde queda en pantalla la del ordenador de un puesto: arriba o
 * abajo. Un impar mira al norte, que está arriba salvo con las filas dadas la
 * vuelta.
 */
export function screenSide(seat: number, look: MapLook): 'up' | 'down' {
  const north = (seat % 2 === 1) !== look.flipFacing

  return north !== look.flipRows ? 'up' : 'down'
}
