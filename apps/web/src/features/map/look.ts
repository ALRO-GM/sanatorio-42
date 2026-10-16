/**
 * Cómo quiere ver cada cual el mapa de clusters: girado o no, con el círculo
 * de cada persona y a quién resaltar. Se guarda en el navegador; si no deja
 * guardar, se ve como de fábrica.
 */

import type { ClusterMap, MapSeat } from '@sanatorio/contracts'

/** A quién se puede resaltar respecto de quien mira. */
export type Mate = 'circle' | 'project' | 'done'

export const MATES: readonly Mate[] = ['circle', 'project', 'done']

export type MapLook = {
  /** El plano dado la vuelta: la última fila arriba y el último puesto a la izquierda. */
  flip: boolean
  /** El número del círculo en la esquina de cada puesto ocupado. */
  circles: boolean
  /** A quién resaltar; con alguno marcado, el resto se apaga. */
  mates: Mate[]
}

/** Nota con la que un proyecto sale perfecto: brillo dorado. */
export const PERFECT_MARK = 125

const KEY = 'sanatorio_map_look'

export const DEFAULT_LOOK: MapLook = { flip: false, circles: false, mates: [] }

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
      flip: read?.flip === true,
      circles: read?.circles === true,
      mates: Array.isArray(read?.mates)
        ? MATES.filter((mate) => read.mates?.includes(mate) === true)
        : [],
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
